// Initialize variables
let theme = localStorage.getItem("theme") || "light";
let language = localStorage.getItem("language") || "en";
let style = localStorage.getItem("style") || "minimal";

// Translations
const translations = {
  en: { name: "Name", email: "Email", phone: "Phone", education: "Education", experience: "Experience", skills: "Skills", languages: "Languages" },
  hi: { name: "नाम", email: "ईमेल", phone: "फोन", education: "शिक्षा", experience: "अनुभव", skills: "कौशल", languages: "भाषाएँ" }
};

// Apply initial settings
document.body.className = `bg-${theme === "dark" ? "gray-800" : "gray-100"} p-4`;
document.getElementById("language").value = language;
document.getElementById("style").value = style;
changeLanguage();
applyStyle();

// Event handlers
function handleDragOver(event) { event.preventDefault(); }
function handleDrop(event) {
  event.preventDefault();
  handleFileUpload({ target: { files: event.dataTransfer.files } });
}
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const status = document.getElementById("uploadStatus");
  const spinner = document.getElementById("spinner");
  status.textContent = `Processing ${file.name}...`;
  spinner.classList.remove("hidden");

  const reader = new FileReader();
  reader.onload = function(e) {
    const arrayBuffer = e.target.result;
    parseFile(file.type, arrayBuffer, file).then(text => {
      if (text) parseResumeText(text);
      status.textContent = text ? "File processed successfully!" : "Error: Failed to process file.";
      spinner.classList.add("hidden");
    }).catch(error => {
      status.textContent = `Error: ${error.message}`;
      spinner.classList.add("hidden");
    });
  };
  if (file.type === "application/pdf") reader.readAsArrayBuffer(file);
  else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") reader.readAsArrayBuffer(file);
  else if (file.type === "text/plain") reader.readAsText(file);
  else {
    status.textContent = "Unsupported file type. Use .pdf, .docx, or .txt.";
    spinner.classList.add("hidden");
  }
}

async function parseFile(fileType, data, file) {
  try {
    if (fileType === "application/pdf") {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      let text = textContent.items.map(item => item.str).join(" ");
      if (!text.trim()) {
        // Fallback to OCR for image-based PDFs
        text = await performOCR(data);
      }
      return text;
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const zip = new JSZip();
      const doc = await zip.loadAsync(data);
      const xml = await doc.file("word/document.xml").async("string");
      const parser = new DOMParser();
      const docXml = parser.parseFromString(xml, "text/xml");
      return Array.from(docXml.getElementsByTagName("w:t")).map(t => t.textContent).join(" ");
    } else if (fileType === "text/plain") {
      return data;
    }
    return "";
  } catch (error) {
    throw new Error("File parsing failed: " + error.message);
  }
}

async function performOCR(data) {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await page.render({ canvasContext: context, viewport: viewport }).promise;
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    Tesseract.recognize(imageData, 'eng', {
      logger: m => console.log(m)
    }).then(({ data: { text } }) => resolve(text)).catch(err => reject(err));
  });
}

function parseManualInput() {
  const text = document.getElementById("manualInput").value;
  if (text) {
    parseResumeText(text);
    document.getElementById("manualInput").value = "";
  } else {
    alert("Please paste resume text first!");
  }
}

function parseResumeText(text) {
  // Normalize text
  const normalizedText = text.replace(/\n+/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
  const originalText = text.replace(/\n+/g, " ").trim();

  // Name
  const nameMatch = originalText.match(/(YOUR NAME-XYZ|[A-Z][a-z]+(?:[- ][A-Z][a-z]+)*)/i);
  document.getElementById("name").value = nameMatch ? nameMatch[0].replace("YOUR NAME-XYZ", "").trim() || "Jane Smith" : "Jane Smith";

  // Email
  const emailMatch = originalText.match(/[\w.-]+@[\w.-]+\.\w+/i);
  document.getElementById("email").value = emailMatch ? emailMatch[0] : "";

  // Phone
  const phoneMatch = originalText.match(/\b\d{4}-\d{3}-\d{4}\b/i);
  document.getElementById("phone").value = phoneMatch ? phoneMatch[0] : "";

  // Education
  const eduMatch = originalText.match(/(EDUCATION|UNIVERSITY|SCHOOL)[\s\S]*?(?=(EXPERIENCE|EMPLOYMENT|WORK HISTORY|CONTACT|PROFILE|HOBBIES|$))/i);
  document.getElementById("education").value = eduMatch ? eduMatch[0].replace(/(EDUCATION|UNIVERSITY|SCHOOL)/i, "").trim() : "";

  // Experience
  const expMatch = originalText.match(/(EXPERIENCE|EMPLOYMENT|WORK HISTORY)[\s\S]*?(?=(EDUCATION|SKILLS|LANGUAGES|CONTACT|PROFILE|HOBBIES|$))/i);
  document.getElementById("experience").value = expMatch ? expMatch[0].replace(/(EXPERIENCE|EMPLOYMENT|WORK HISTORY)/i, "").trim() : "";

  // Skills
  const skillsMatch = originalText.match(/(CLUBS & SOCIETIES|SKILLS)[\s\S]*?(?=(EDUCATION|EXPERIENCE|LANGUAGES|CONTACT|PROFILE|HOBBIES|$))/i);
  const skills = skillsMatch ? skillsMatch[0].replace(/(CLUBS & SOCIETIES|SKILLS)/i, "").split(/[,;\s]+/).filter(s => s.trim()) : [];
  document.getElementById("skills").value = skills.join(",");
  updateSkillInputs(skills.join(","));

  // Languages
  const langMatch = originalText.match(/(LANGUAGES)[\s\S]*?(?=(EDUCATION|EXPERIENCE|SKILLS|CONTACT|PROFILE|HOBBIES|$))/i);
  const languages = langMatch ? langMatch[0].replace(/LANGUAGES/i, "").split(/[,;\s]+/).filter(l => l.trim()) : [];
  document.getElementById("languages").value = languages.join(",");
  updateLanguageInputs(languages.join(","));

  updatePreview();
  saveFormData();
}

function changeLanguage() {
  language = document.getElementById("language").value;
  localStorage.setItem("language", language);
  updateLabels();
}

function applyStyle() {
  style = document.getElementById("style").value;
  localStorage.setItem("style", style);
  const preview = document.getElementById("preview");
  preview.className = `mt-4 p-4 bg-white rounded ${style === "modern" ? "shadow-lg" : style === "professional" ? "border-2 border-gray-300" : ""}`;
}

function toggleTheme() {
  theme = theme === "light" ? "dark" : "light";
  document.body.className = `bg-${theme === "dark" ? "gray-800" : "gray-100"} p-4`;
  localStorage.setItem("theme", theme);
}

function updateLabels() {
  const lang = translations[language];
  document.getElementById("nameLabel").textContent = lang.name;
  document.getElementById("emailLabel").textContent = lang.email;
  document.getElementById("phoneLabel").textContent = lang.phone;
  document.getElementById("educationLabel").textContent = lang.education;
  document.getElementById("experienceLabel").textContent = lang.experience;
  document.getElementById("skillsLabel").textContent = lang.skills;
  document.getElementById("languagesLabel").textContent = lang.languages;
  document.getElementById("manualInputLabel").textContent = `Paste Resume Text (${lang.name.toLowerCase()} or ${translations.hi.name.toLowerCase()})`;
}

function updatePreview() {
  const formData = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    education: document.getElementById("education").value,
    experience: document.getElementById("experience").value,
    skills: document.getElementById("skills").value.split(",").filter(s => s.trim()),
    languages: document.getElementById("languages").value.split(",").filter(l => l.trim())
  };
  let preview = `<h2>Live Preview</h2>`;
  preview += `<p><strong>${translations[language].name}:</strong> ${formData.name}</p>`;
  preview += `<p><strong>${translations[language].email}:</strong> ${formData.email}</p>`;
  preview += `<p><strong>${translations[language].phone}:</strong> ${formData.phone}</p>`;
  preview += `<p><strong>${translations[language].education}:</strong> ${formData.education}</p>`;
  preview += `<p><strong>${translations[language].experience}:</strong> ${formData.experience}</p>`;
  preview += `<p><strong>${translations[language].skills}:</strong> ${formData.skills.join(", ")}</p>`;
  preview += `<p><strong>${translations[language].languages}:</strong> ${formData.languages.join(", ")}</p>`;
  document.getElementById("preview").innerHTML = preview;
}

function addSkillInput() {
  const skillsList = document.getElementById("skillsList");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "w-full p-2 border rounded mt-2";
  input.oninput = () => updateSkillInputs(document.getElementById("skills").value);
  skillsList.appendChild(input);
  updateSkillInputs(document.getElementById("skills").value);
}

function addLanguageInput() {
  const languagesList = document.getElementById("languagesList");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "w-full p-2 border rounded mt-2";
  input.oninput = () => updateLanguageInputs(document.getElementById("languages").value);
  languagesList.appendChild(input);
  updateLanguageInputs(document.getElementById("languages").value);
}

function updateSkillInputs(value) {
  const skills = value.split(",").map(s => s.trim()).filter(s => s);
  const inputs = document.getElementById("skillsList").getElementsByTagName("input");
  for (let i = 0; i < inputs.length; i++) {
    inputs[i].value = skills[i] || "";
  }
  document.getElementById("skills").value = skills.join(",");
  updatePreview();
}

function updateLanguageInputs(value) {
  const languages = value.split(",").map(l => l.trim()).filter(l => l);
  const inputs = document.getElementById("languagesList").getElementsByTagName("input");
  for (let i = 0; i < inputs.length; i++) {
    inputs[i].value = languages[i] || "";
  }
  document.getElementById("languages").value = languages.join(",");
  updatePreview();
}

function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text("Resume", 10, 10);
  const formData = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    education: document.getElementById("education").value,
    experience: document.getElementById("experience").value,
    skills: document.getElementById("skills").value.split(",").filter(s => s.trim()),
    languages: document.getElementById("languages").value.split(",").filter(l => l.trim())
  };
  let y = 20;
  doc.text(`Name: ${formData.name}`, 10, y += 10);
  doc.text(`Email: ${formData.email}`, 10, y += 10);
  doc.text(`Phone: ${formData.phone}`, 10, y += 10);
  doc.text(`Education: ${formData.education}`, 10, y += 10);
  doc.text(`Experience: ${formData.experience}`, 10, y += 10);
  doc.text(`Skills: ${formData.skills.join(", ")}`, 10, y += 10);
  doc.text(`Languages: ${formData.languages.join(", ")}`, 10, y += 10);
  doc.save("resume.pdf");
}

function clearForm() {
  document.getElementById("resumeForm").reset();
  document.getElementById("skillsList").innerHTML = "";
  document.getElementById("languagesList").innerHTML = "";
  document.getElementById("preview").innerHTML = "";
  localStorage.removeItem("resumeData");
  updatePreview();
}

function saveFormData() {
  const formData = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    education: document.getElementById("education").value,
    experience: document.getElementById("experience").value,
    skills: document.getElementById("skills").value,
    languages: document.getElementById("languages").value
  };
  localStorage.setItem("resumeData", JSON.stringify(formData));
  alert("Profile saved successfully!");
}

function saveProfile() {
  saveFormData();
}

function loadFormData() {
  const data = JSON.parse(localStorage.getItem("resumeData") || "{}");
  document.getElementById("name").value = data.name || "";
  document.getElementById("email").value = data.email || "";
  document.getElementById("phone").value = data.phone || "";
  document.getElementById("education").value = data.education || "";
  document.getElementById("experience").value = data.experience || "";
  document.getElementById("skills").value = data.skills || "";
  updateSkillInputs(data.skills || "");
  document.getElementById("languages").value = data.languages || "";
  updateLanguageInputs(data.languages || "");
  updatePreview();
}

window.onload = loadFormData;