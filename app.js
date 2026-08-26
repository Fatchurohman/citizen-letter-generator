const CONFIG = {
  // Masukkan URL Web App Google Apps Script milikmu di bawah ini
  GAS_URL: "SALIN_URL_WEB_APP_GAS_DISINI"
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
    letterType: dom.letterType?.value || '',
    letterNumber: dom.letterNumber?.value.trim() || '[Nomor Surat]',
    fullName: dom.fullName?.value.trim() || '',
    nik: dom.nik?.value.trim() || '',
    gender: dom.gender?.value || '',
    birthPlace: dom.birthPlace?.value.trim() || '',
    birthDate: formatDate(dom.birthDate?.value),
    occupation: dom.occupation?.value.trim() || '',
    address: dom.address?.value.trim() || '',
    rtName: dom.rtName?.value.trim() || '',
    rwName: dom.rwName?.value.trim() || '',
    purpose: dom.purpose?.value.trim() || '',
    currentDate: formatCurrentDate()
  };

  setLoadingState(true);

  try {
    const rawHtml = await fetchLetterAI(payloadData);
    if (!dom.letterOutput) throw new Error('Elemen preview dokumen tidak ditemukan di DOM.');
    
    dom.letterOutput.innerHTML = sanitizeOutput(rawHtml);
    dom.copyBtn.disabled = false;
    dom.printBtn.disabled = false;
    showStatus('Dokumen surat berhasil disusun secara otomatis.', 'success');
  } catch (err) {
    const errorMessage = typeof err === 'string' ? err : (err?.message || JSON.stringify(err));
    showStatus(`Gagal memproses dokumen: ${errorMessage}`, 'error');
  } finally {
    setLoadingState(false);
  }
});

async function fetchLetterAI(data) {
  if (!CONFIG.GAS_URL || CONFIG.GAS_URL.startsWith('SALIN_URL')) {
    throw new Error('URL Google Apps Script belum dikonfigurasi di app.js.');
  }

  const res = await fetch(CONFIG.GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(`HTTP Error status: ${res.status}`);
  }

  const responseText = await res.text();
  let dataRes;
  try {
    dataRes = JSON.parse(responseText);
  } catch {
    throw new Error('Gagal melakukan parsing data JSON dari server.');
  }

  if (dataRes?.error) {
    throw new Error(dataRes.error);
  }

  const textOutput = dataRes?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('Respon AI kosong atau format data tidak valid.');
  }

  return textOutput.replace(/^```html\s*|```\s*$/gi, '').trim();
}

dom.copyBtn?.addEventListener('click', async () => {
  const content = dom.letterOutput?.innerText;
  if (!content) return;
  try {
    await navigator.clipboard.writeText(content);
    showStatus('Teks surat berhasil disalin.', 'info');
  } catch {
    showStatus('Gagal menyalin teks.', 'error');
  }
});

dom.printBtn?.addEventListener('click', () => {
  window.print();
});

function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatCurrentDate() {
  return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function sanitizeOutput(html) {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function setLoadingState(isLoading) {
  if (!dom.generateBtn) return;
  dom.generateBtn.disabled = isLoading;
  if (isLoading) {
    if (dom.btnText) dom.btnText.textContent = 'Membuat Surat...';
    dom.spinner?.classList.remove('hidden');
  } else {
    if (dom.btnText) dom.btnText.textContent = 'Buat Surat Otomatis';
    dom.spinner?.classList.add('hidden');
  }
}

function showStatus(text, type) {
  if (!dom.statusMessage) return;
  dom.statusMessage.textContent = text;
  dom.statusMessage.className = `status-msg ${type}`;
}

function clearStatus() {
  if (!dom.statusMessage) return;
  dom.statusMessage.textContent = '';
  dom.statusMessage.className = 'status-msg hidden';
}
