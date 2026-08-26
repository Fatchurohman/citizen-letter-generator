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
  const GAS_URL = "https://script.google.com/macros/s/AKfycbz1fX53liAfW2zUZNDydG2PdD0f5T8HaZI8LMxSX9PyNdApEiMhrGbNOmfSrIxTcK1xcQ/exec";

  const res = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(`HTTP Code ${res.status}`);
  }

  const dataRes = await res.json();
  
  if (dataRes.error) {
    throw new Error(dataRes.error);
  }

  const textOutput = dataRes?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error('Respon AI kosong atau gagal diproses.');
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
