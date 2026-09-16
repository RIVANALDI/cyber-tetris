# CYBER TETRIS - Modern Arcade Web Game

Game web Tetris modern, responsif, dan kaya fitur yang dibangun menggunakan **HTML5 Canvas**, **CSS3 (Neon Cyberpunk & Glassmorphism)**, dan **JavaScript murni (Vanilla JS)** serta **Web Audio API**.

---

## ✨ Fitur Utama

1. **Visual & Desain Futuristik**:
   - Tema *Cyberpunk Neon* dengan efek *glassmorphism*, partikel ledakan saat baris terhapus (*line clear*), dan bayangan jatuh (*ghost piece*).
   - 4 Pilihan Tema Visual: *Cyberpunk Neon*, *Retro 80s Synthwave*, *Midnight Ocean*, dan *Pastel Kawaii*.
   - Efek getaran layar (*screen shake*) saat melakukan *Hard Drop* atau *TETRIS* (4 baris sekaligus).

2. **Mekanisme Standar (Tetris Guidelines)**:
   - 7 Bentuk Balok Tetromino (I, J, L, O, S, T, Z) dengan sistem acak adil **7-Bag Randomizer**.
   - **Super Rotation System (SRS)** dengan *wall kicks* lengkap.
   - **Hold Piece** (Simpan balok untuk digunakan nanti).
   - Antrian **Next Pieces** (melihat 3 balok berikutnya).
   - Kalkulasi skor resmi: Single, Double, Triple, TETRIS, Back-to-Back Bonus, Combo Bonus, dan Soft/Hard Drop bonus.
   - Kenaikan level dan kecepatan otomatis setiap 10 baris.

3. **Audio Sintetis (Web Audio API)**:
   - Efek suara 8-bit / chiptune untuk setiap interaksi tanpa memerlukan file MP3/WAV eksternal.
   - Musik latar chiptune dinamis (lagu tema klasik Tetris *Korobeiniki*).
   - Kontrol pengaturan volume BGM dan SFX serta tombol Mute.

4. **Kontrol Responsif & Multi-Platform**:
   - Dukungan penuh keyboard untuk Desktop / PC.
   - Kontrol virtual layar sentuh (*Touch D-Pad & Action Buttons*) untuk HP dan Tablet.
   - Penyimpanan skor tertinggi (*High Score*) otomatis di browser (*localStorage*).

---

## 🎮 Kontrol Permainan (Keyboard)

| Aksi | Tombol Keyboard |
|---|---|
| **Geser Kiri / Kanan** | `◄` / `►` atau `A` / `D` |
| **Putar Searah Jarum Jam** | `▲` atau `W` / `X` |
| **Putar Berlawanan Jarum Jam** | `Z` |
| **Soft Drop (Turun Cepat)** | `▼` atau `S` |
| **Hard Drop (Langsung Kunci)** | `SPASI` (Spacebar) |
| **Hold Piece (Simpan Balok)** | `C` atau `Shift` |
| **Jeda / Lanjutkan (Pause)** | `P` atau `ESC` |
| **Ulangi Permainan (Restart)** | `R` |

---

## 🚀 Cara Menjalankan

Cukup buka file `index.html` di browser favorit Anda (Google Chrome, Microsoft Edge, Brave, Firefox, Safari) atau gunakan live server lokal:

```bash
# Opsi 1: Buka langsung file index.html di browser
# Opsi 2: Jalankan simple http-server / live-server
npx -y serve .
```
