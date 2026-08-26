export default async function handler(req, res) {
  // CORS Header agar bisa diakses dari frontend GitHub Pages
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    // Mengambil API key dari Environment Variable aman di Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    const model = 'gemini-3.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const promptSystem = `Anda adalah staf sekretariat RT/RW di Indonesia. 
Buat format surat dinas resmi siap cetak standar A4 menggunakan tag HTML utuh (div, table, p, hr, b, dsb).
Format Dokumen:
1. Kop Surat RT/RW (Tengah, ada garis pembatas hr).
2. Judul Surat & Nomor Surat.
3. Pembuka formal.
4. Tabel rincian biodata pemohon (Nama, NIK, Tempat/Tgl Lahir, Jenis Kelamin, Pekerjaan, Alamat).
5. Keterangan isi permohonan.
6. Penutup formal.
7. Kolom tanda tangan di bawah (Kiri: Ketua RW, Kanan: Ketua RT dengan tempat & tanggal).
Gunakan bahasa formal dan EYD baku. Jangan tambahkan markdown fence pada respon.`;

    const promptUser = `Jenis Surat: ${data.letterType}
Nomor Surat: ${data.letterNumber}
Tanggal Surat: ${data.currentDate}
Data Pemohon:
- Nama: ${data.fullName}
- NIK: ${data.nik}
- Tempat, Tanggal Lahir: ${data.birthPlace}, ${data.birthDate}
- Jenis Kelamin: ${data.gender}
- Pekerjaan: ${data.occupation}
- Alamat: ${data.address}
Keperluan: ${data.purpose}
Pengesahan:
- Ketua RT: ${data.rtName}
- Ketua RW: ${data.rwName}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${promptSystem}\n\n${promptUser}` }]
        }
      ],
      generationConfig: {
        temperature: 0.1
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(body)
    });

    const resultJson = await response.json();
    
    if (!response.ok) {
      throw new Error(resultJson?.error?.message || 'Gagal menghubungi server AI');
    }

    return res.status(200).json(resultJson);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
