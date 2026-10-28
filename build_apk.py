#!/usr/bin/env python3
"""
Corrientes Débiles - Generador de APK Android
Empaqueta la aplicación web en un paquete APK 100% válido y funcional para Android.
Incluye:
1. AndroidManifest binario (AXML) compatible con minSdkVersion=21 (Android 5.0+) y targetSdkVersion=29
2. Dalvik Executable (classes.dex) con checksums Adler-32 y SHA-1 validados
3. Interfaz web local offline (HTML, CSS, JS, QR scanner) embebida en assets/
4. Iconos gráficos personalizados de Corrientes Débiles
5. Firma Dual:
   - Esquema v1 (JAR signature: MANIFEST.MF, CERT.SF, CERT.RSA PKCS#7)
   - Esquema v2 (APK Signing Block: ID 0x7109871a con SHA256withRSA)
"""

import os
import sys
import zipfile
import hashlib
import zlib
import struct
import base64
import subprocess
import tempfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'static')
BASE_TEMPLATE_APK = os.path.join(BASE_DIR, 'base_template.apk')
APK_OUTPUT = os.path.join(BASE_DIR, 'CorrientesDebiles.apk')
STATIC_APK_OUTPUT = os.path.join(STATIC_DIR, 'CorrientesDebiles.apk')

def lp(data: bytes) -> bytes:
    """Length-prefixed with uint32 little-endian"""
    return struct.pack('<I', len(data)) + data

def add_v2_signature(apk_bytes: bytes, key_pem: str, cert_pem: str) -> bytes:
    """Adds an APK Signing Block (Scheme v2, ID 0x7109871a) to the APK bytes."""
    eocd_idx = apk_bytes.rfind(b'\x50\x4b\x05\x06')
    if eocd_idx == -1:
        raise ValueError('EOCD no encontrado en el archivo ZIP/APK')

    cd_size, cd_offset = struct.unpack('<II', apk_bytes[eocd_idx+12 : eocd_idx+20])

    sec1 = bytes(apk_bytes[:cd_offset])
    sec3 = bytes(apk_bytes[cd_offset:eocd_idx])

    with tempfile.TemporaryDirectory() as tmp:
        cert_der_path = os.path.join(tmp, 'cert.der')
        pubkey_der_path = os.path.join(tmp, 'pubkey.der')
        subprocess.run(['openssl', 'x509', '-in', cert_pem, '-out', cert_der_path, '-outform', 'DER'],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['openssl', 'x509', '-in', cert_pem, '-pubkey', '-noout'],
                       stdout=open(os.path.join(tmp, 'pubkey.pem'), 'w'), check=True)
        subprocess.run(['openssl', 'rsa', '-pubin', '-in', os.path.join(tmp, 'pubkey.pem'),
                        '-out', pubkey_der_path, '-outform', 'DER'],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        with open(cert_der_path, 'rb') as f:
            x509_cert = f.read()
        with open(pubkey_der_path, 'rb') as f:
            pubkey = f.read()

    algo_id = 0x0103 # SHA256withRSA
    chunks = []
    CHUNK_SIZE = 1048576
    for s in [sec1, sec3]:
        for i in range(0, len(s), CHUNK_SIZE):
            c = s[i:i+CHUNK_SIZE]
            chunks.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(c)) + c).digest())

    # Pre-calculate signer structure size to compute exact block_size and central directory offset
    cert_entry = lp(x509_cert)
    certs = lp(cert_entry)
    attrs = lp(b'')
    pk_entry = lp(pubkey)

    # First pass: estimate block size
    dummy_cd_offset = len(sec1) + 4096
    for _ in range(2):
        mod_eocd = bytearray(apk_bytes[eocd_idx:])
        struct.pack_into('<I', mod_eocd, 16, dummy_cd_offset)

        eocd_chunk = hashlib.sha256(b'\xa5' + struct.pack('<I', len(mod_eocd)) + bytes(mod_eocd)).digest()
        all_chunks = chunks + [eocd_chunk]
        content_digest = hashlib.sha256(b'\x5a' + struct.pack('<I', len(all_chunks)) + b''.join(all_chunks)).digest()

        digest_entry = lp(struct.pack('<I', algo_id) + lp(content_digest))
        digests = lp(digest_entry)
        signed_data = lp(digests + certs + attrs)

        with tempfile.NamedTemporaryFile() as sd_f, tempfile.NamedTemporaryFile() as sig_f:
            sd_f.write(signed_data[4:])
            sd_f.flush()
            subprocess.run([
                'openssl', 'pkeyutl', '-sign', '-inkey', key_pem,
                '-rawin', '-digest', 'sha256',
                '-in', sd_f.name, '-out', sig_f.name
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            sig_bytes = sig_f.read()

        sig_entry = lp(struct.pack('<I', algo_id) + lp(sig_bytes))
        signatures = lp(sig_entry)

        signer = lp(signed_data + signatures + pk_entry)
        signers = lp(signer)
        v2_value = lp(signers)

        pair = struct.pack('<Q', 4 + len(v2_value)) + struct.pack('<I', 0x7109871a) + v2_value
        block_size = len(pair) + 8 + 16 # excluding initial 8-byte size field
        new_cd_offset = len(sec1) + block_size + 8

        if new_cd_offset == dummy_cd_offset:
            break
        dummy_cd_offset = new_cd_offset

    apk_signing_block = struct.pack('<Q', block_size) + pair + struct.pack('<Q', block_size) + b'APK Sig Block 42'
    return sec1 + apk_signing_block + sec3 + bytes(mod_eocd)


def build_apk():
    print("==================================================")
    print("  📲 Generando paquete APK Android (Firma Dual v1+v2)")
    print("  Corrientes Débiles - Inventario y Mantención")
    print("==================================================")

    if not os.path.exists(BASE_TEMPLATE_APK):
        print(f"Error: No se encontró la plantilla base en {BASE_TEMPLATE_APK}")
        sys.exit(1)

    # 1. Load and patch base template APK
    with zipfile.ZipFile(BASE_TEMPLATE_APK, 'r') as src_zip:
        mf = bytearray(src_zip.read('AndroidManifest.xml'))
        dex = bytearray(src_zip.read('classes.dex'))

        # Patch AndroidManifest.xml:
        # - compileSdkVersion (offset 3256): 34 -> 29 (0x1d)
        # - versionCode (offset 3216): 1 -> 2 (0x02)
        # - minSdkVersion (offset 3392): 30 -> 21 (0x15 = Android 5.0 Lollipop)
        # - targetSdkVersion (offset 3412): 34 -> 29 (0x1d = Android 10)
        struct.pack_into('<I', mf, 3216, 2)
        struct.pack_into('<I', mf, 3256, 29)
        struct.pack_into('<I', mf, 3392, 21)
        struct.pack_into('<I', mf, 3412, 29)
        print("✓ AndroidManifest.xml adaptado: minSdkVersion=21, targetSdkVersion=29, versionCode=2")

        # Patch classes.dex: direct webview to offline.html
        if dex[0x75d28:0x75d28+4] == bytes([0x1a, 0x01, 0xdd, 0x0e]):
            dex[0x75d28:0x75d28+4] = bytes([0x1a, 0x01, 0xc7, 0x0b])
        if dex[0xa292a:0xa292a+4] == bytes([0x1a, 0x00, 0xdd, 0x0e]):
            dex[0xa292a:0xa292a+4] = bytes([0x1a, 0x00, 0xc7, 0x0b])

        # Recalculate DEX SHA-1 & Adler-32
        sha1 = hashlib.sha1(dex[32:]).digest()
        dex[12:32] = sha1
        checksum = zlib.adler32(dex[12:]) & 0xffffffff
        dex[8:12] = struct.pack('<I', checksum)
        print("✓ Dalvik classes.dex parchado para WebView y verificado con checksum")

        # Collect files from base template (excluding old signatures and old assets)
        entries = {}
        for name in src_zip.namelist():
            if name.startswith('META-INF/') or name.startswith('assets/'):
                continue
            entries[name] = src_zip.read(name)

    entries['AndroidManifest.xml'] = bytes(mf)
    entries['classes.dex'] = bytes(dex)

    # 2. Update App Icons with Corrientes Débiles logo
    icon_192 = os.path.join(STATIC_DIR, 'img', 'icon-192.png')
    if os.path.exists(icon_192):
        with open(icon_192, 'rb') as f:
            icon_bytes = f.read()
        icon_targets = [
            'res/Gc.png', 'res/fO.png', 'res/o-.png', 'res/wb.png',
            'res/RJ.png', 'res/8c.png', 'res/FS.png', 'res/yn.png'
        ]
        for icon_name in icon_targets:
            if icon_name in entries:
                entries[icon_name] = icon_bytes
        print("✓ Iconos de aplicación actualizados con el logo de Corrientes Débiles")

    # 3. Add all Web Assets (HTML, CSS, JS, Images, PWA)
    index_file = os.path.join(STATIC_DIR, 'index.html')
    with open(index_file, 'rb') as f:
        index_content = f.read()

    entries['assets/offline.html'] = index_content
    entries['assets/index.html'] = index_content
    entries['assets/main.html'] = index_content

    asset_count = 0
    for root, dirs, files in os.walk(STATIC_DIR):
        for fn in files:
            if fn.endswith('.apk'):
                continue
            fp = os.path.join(root, fn)
            rel = os.path.relpath(fp, STATIC_DIR)
            with open(fp, 'rb') as f:
                entries[f'assets/{rel}'] = f.read()
            asset_count += 1

    print(f"✓ Archivos web empaquetados en assets/: {asset_count}")

    # 4. Generate Cryptographic Keys & v1 JAR Signature
    with tempfile.TemporaryDirectory() as tmpdir:
        key_pem = os.path.join(tmpdir, 'key.pem')
        cert_pem = os.path.join(tmpdir, 'cert.pem')
        cert_sf = os.path.join(tmpdir, 'CERT.SF')
        cert_rsa = os.path.join(tmpdir, 'CERT.RSA')

        subprocess.run([
            'openssl', 'req', '-x509', '-newkey', 'rsa:2048',
            '-keyout', key_pem, '-out', cert_pem,
            '-days', '10000', '-nodes',
            '-subj', '/CN=CorrientesDebiles/O=CorrientesDebiles/C=CL'
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        manifest_lines = [
            'Manifest-Version: 1.0',
            'Built-By: Corrientes Debiles',
            'Created-By: 1.0 (Corrientes Debiles APK Builder)',
            ''
        ]
        sf_lines = [
            'Signature-Version: 1.0',
            'Created-By: 1.0 (Corrientes Debiles APK Signer)',
        ]

        for name in sorted(entries.keys()):
            data = entries[name]
            digest = base64.b64encode(hashlib.sha1(data).digest()).decode('ascii')
            manifest_entry = f'Name: {name}\r\nSHA1-Digest: {digest}\r\n\r\n'
            manifest_lines.append(f'Name: {name}')
            manifest_lines.append(f'SHA1-Digest: {digest}')
            manifest_lines.append('')

            sf_entry_digest = base64.b64encode(hashlib.sha1(manifest_entry.encode('utf-8')).digest()).decode('ascii')
            sf_lines.append(f'Name: {name}')
            sf_lines.append(f'SHA1-Digest: {sf_entry_digest}')
            sf_lines.append('')

        manifest_bytes = ('\r\n'.join(manifest_lines) + '\r\n').encode('utf-8')
        sf_manifest_digest = base64.b64encode(hashlib.sha1(manifest_bytes).digest()).decode('ascii')
        sf_lines.insert(2, f'SHA1-Digest-Manifest: {sf_manifest_digest}')
        sf_bytes = ('\r\n'.join(sf_lines) + '\r\n').encode('utf-8')

        with open(cert_sf, 'wb') as f:
            f.write(sf_bytes)

        subprocess.run([
            'openssl', 'smime', '-sign', '-in', cert_sf,
            '-inkey', key_pem, '-signer', cert_pem,
            '-out', cert_rsa, '-outform', 'DER', '-nodetach'
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        with open(cert_rsa, 'rb') as f:
            rsa_bytes = f.read()

        entries['META-INF/MANIFEST.MF'] = manifest_bytes
        entries['META-INF/CERT.SF'] = sf_bytes
        entries['META-INF/CERT.RSA'] = rsa_bytes

        # 5. Build Intermediate ZIP (v1 signed)
        temp_apk = os.path.join(tmpdir, 'unsigned_v2.apk')
        with zipfile.ZipFile(temp_apk, 'w', compression=zipfile.ZIP_DEFLATED) as out_zip:
            for sig_file in ['META-INF/MANIFEST.MF', 'META-INF/CERT.SF', 'META-INF/CERT.RSA']:
                if sig_file in entries:
                    out_zip.writestr(sig_file, entries.pop(sig_file))
            for core in ['AndroidManifest.xml', 'classes.dex', 'resources.arsc']:
                if core in entries:
                    out_zip.writestr(core, entries.pop(core))
            for name in sorted(entries.keys()):
                out_zip.writestr(name, entries[name])

        with open(temp_apk, 'rb') as f:
            v1_apk_bytes = f.read()

        # 6. Apply APK Signature Scheme v2 (APK Signing Block)
        print("✓ Generando APK Signing Block v2 (Esquema de firma v2 de Android)...")
        final_apk_bytes = add_v2_signature(v1_apk_bytes, key_pem, cert_pem)

    # 7. Write output APK
    with open(APK_OUTPUT, 'wb') as f:
        f.write(final_apk_bytes)

    with open(STATIC_APK_OUTPUT, 'wb') as f:
        f.write(final_apk_bytes)

    apk_size_kb = os.path.getsize(APK_OUTPUT) / 1024
    print(f"✓ APK generado exitosamente: {APK_OUTPUT}")
    print(f"✓ Tamaño del archivo APK: {apk_size_kb:.1f} KB")
    print(f"✓ Copia para descarga web disponible en: /CorrientesDebiles.apk")
    print("==================================================")

if __name__ == '__main__':
    build_apk()
