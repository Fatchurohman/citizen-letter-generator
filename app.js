const CONFIG = {
  GEMINI_MODEL: 'gemini-2.5-flash', // Menggunakan model stabil standar
  MASTER_KEY: 'AQ.Ab8RN6JB_EZVnSnLgTpw6cctSPkFqhXNHf_QNR-ivb081uYu-g'
};

const dom = {
  form: document.getElementById('letterForm'),
  letterType: document.getElementById('letterType'),
  letterNumber: document.getElementById('letterNumber'),
  fullName: document.getElementById('fullName'),
  nik: document.getElementById('nik'),
  gender: document.getElementById('gender'),
  birthPlace: document.getElementById('birthPlace'),
  birthDate: document.getElementById('birthDate'),
  occupation: document.getElementById('occupation'),
  address: document.getElementById('address'),
  rtName: document.getElementById('rtName'),
  rwName: document.getElementById('rwName'),
  purpose: document.getElementById('purpose'),
  generateBtn: document.getElementById('generateBtn'),
  btnText: document.querySelector('.btn-text'),
  spinner: document.querySelector('.spinner'),
  letterOutput: document.getElementById('letterOutput'),
  copyBtn: document.getElementById('copyBtn'),
  printBtn: document.getElementById('printBtn'),
  statusMessage: document.getElementById('statusMessage')
};

dom.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearStatus();

  const payloadData = {
    letterType: dom.letterType.value,
    letterNumber: dom.letterNumber.value.trim() || '[Nomor Surat]',
    fullName: dom.fullName.value.trim(),
    nik: dom.nik.value.trim(),
    gender: dom.gender.value,
    birthPlace: dom.birthPlace.value.trim(),
    birthDate: formatDate(dom.birthDate.value),
    occupation: dom.occupation.value.trim(),
    address: dom.address.value.trim(),
    rtName: dom.rtName.value.trim(),
    rwName: dom.rwName.value.trim(),
    purpose: dom.purpose.value.trim(),
    currentDate: formatCurrentDate()
  };

  setLoadingState(true);

  try {
    const rawHtml = await fetchLetterAI(payloadData);
    dom.letterOutput.innerHTML = sanitizeOutput(rawHtml);
    dom.copyBtn.disabled = false;
    dom.printBtn.disabled = false;
    showStatus('Dokumen surat berhasil disusun secara otomatis.', 'success');
  } catch (err) {
    showStatus(`Gagal memproses dokumen: ${err.message}`, 'error');
  } finally {
    setLoadingState(false);
  }
});

async function fetchLetterAI(data) {
  // Menggunakan parameter ?key= agar lolos autentikasi langsung dari browser
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.MASTER_KEY}`;

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

  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    throw new Error(errorJson?.error?.message || `HTTP Code ${res.status}`);
  }

  const dataRes = await res.json();
  const textOutput = dataRes?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error('Respon AI kosong atau tidak valid.');
  }

  return textOutput.replace(/^```html\s*|```\s*$/gi, '').trim();
}

dom.copyBtn.addEventListener('click', async () => {
  const content = dom.letterOutput.innerText;
  if (!content) return;
  try {
    await navigator.clipboard.writeText(content);
    showStatus('Teks surat berhasil disalin.', 'info');
  } catch {
    showStatus('Gagal menyalin teks.', 'error');
  }
});

dom.printBtn.addEventListener('click', () => {
  window.print();
});

function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatCurrentDate() {
  return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function sanitizeOutput(html) {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function setLoadingState(isLoading) {
  dom.generateBtn.disabled = isLoading;
  if (isLoading) {
    dom.btnText.textContent = 'Membuat Surat...';
    dom.spinner.classList.remove('hidden');
  } else {
    dom.btnText.textContent = 'Buat Surat Otomatis';
    dom.spinner.classList.add('hidden');
  }
}

function showStatus(text, type) {
  dom.statusMessage.textContent = text;
  dom.statusMessage.className = `status-msg ${type}`;
}

function clearStatus() {
  dom.statusMessage.textContent = '';
  dom.statusMessage.className = 'status-msg hidden';
}
