const CONFIG = {
  GEMINI_MODEL: 'gemini-2.5-flash',
  STORAGE_KEY_API: 'citizen_letter_api_key'
};

const dom = {
  form: document.getElementById('letterForm'),
  apiKeyInput: document.getElementById('apiKey'),
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

// Inisialisasi API Key tersimpan
document.addEventListener('DOMContentLoaded', () => {
  const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY_API);
  if (savedKey) {
    dom.apiKeyInput.value = savedKey;
  }
});

dom.apiKeyInput.addEventListener('change', (e) => {
  const key = e.target.value.trim();
  if (key) {
    localStorage.setItem(CONFIG.STORAGE_KEY_API, key);
  } else {
    localStorage.removeItem(CONFIG.STORAGE_KEY_API);
  }
});

// Handler Generate Surat
dom.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearStatus();

  const apiKey = dom.apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus('Harap masukkan Gemini API Key terlebih dahulu.', 'error');
    return;
  }

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
    const rawHtml = await fetchLetterAI(apiKey, payloadData);
    dom.letterOutput.innerHTML = sanitizeOutput(rawHtml);
    dom.copyBtn.disabled = false;
    dom.printBtn.disabled = false;
    showStatus('Surat dinas berhasil disusun. Teks siap disunting atau dicetak.', 'success');
  } catch (err) {
    showStatus(`Gagal memproses dokumen: ${err.message}`, 'error');
  } finally {
    setLoadingState(false);
  }
});

// Panggilan Request Gemini API
async function fetchLetterAI(apiKey, data) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const promptSystem = `Anda adalah sekretaris RT/RW di Indonesia yang ahli menyusun surat dinas dan surat pengantar warga resmi. 
Format output WAJIB berupa elemen HTML utuh (menggunakan tag <div>, <p>, <table>, <hr>, <b>, dll) yang langsung siap ditampilkan di lembar dokumen cetak standar A4.
Format Dokumen:
1. Kop Surat RT/RW (Rata tengah, garis ganda/tunggal <hr>).
2. Judul Surat & Nomor Surat.
3. Kalimat pembuka formal.
4. Tabel rincian data pemohon (Nama, NIK, Tempat/Tgl Lahir, Jenis Kelamin, Pekerjaan, Alamat).
5. Isi keterangan lengkap & keperluan pengantar.
6. Kalimat penutup formal.
7. Kolom tanda tangan di bagian bawah (Kiri: Mengetahui Ketua RW, Kanan: Ketua RT, dilengkapi tempat & tanggal).
Gunakan bahasa baku, formal, dan EYD yang benar. Jangan sertakan markdown fence (\`\`\`html) pada respon.`;

  const promptUser = `Susun surat formal berdasarkan data berikut:
- Jenis: ${data.letterType}
- Nomor: ${data.letterNumber}
- Tanggal Terbit: ${data.currentDate}
- Data Warga:
  * Nama: ${data.fullName}
  * NIK: ${data.nik}
  * Tempat/Tgl Lahir: ${data.birthPlace}, ${data.birthDate}
  * Jenis Kelamin: ${data.gender}
  * Pekerjaan: ${data.occupation}
  * Alamat: ${data.address}
- Keperluan: ${data.purpose}
- Pejabat:
  * Ketua RT: ${data.rtName}
  * Ketua RW: ${data.rwName}`;

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    throw new Error(errorJson?.error?.message || `HTTP Code ${res.status}`);
  }

  const dataRes = await res.json();
  const textOutput = dataRes?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error('Hasil respon AI kosong atau format tidak sesuai.');
  }

  return textOutput.replace(/^```html\s*|```\s*$/gi, '').trim();
}

// Salin Teks
dom.copyBtn.addEventListener('click', async () => {
  const content = dom.letterOutput.innerText;
  if (!content) return;

  try {
    await navigator.clipboard.writeText(content);
    showStatus('Teks surat berhasil disalin.', 'info');
  } catch {
    showStatus('Tidak dapat menyalin ke clipboard secara otomatis.', 'error');
  }
});

// Cetak Dokumen
dom.printBtn.addEventListener('click', () => {
  window.print();
});

// Helper Formatting & Sanitasi
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
    dom.btnText.textContent = 'Menyusun Surat...';
    dom.spinner.classList.remove('hidden');
  } else {
    dom.btnText.textContent = 'Generate Surat AI';
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
