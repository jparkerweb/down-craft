// -----------------------------------------------------------------
// -- Background animation setup
// -----------------------------------------------------------------
const docIcons = [
    'fa-file-word',
    'fa-file-excel',
    'fa-file-powerpoint',
    'fa-file-pdf',
    'fa-file-lines'
];

function createFloatingDoc() {
    const doc = document.createElement('i');
    doc.className = `fa-solid ${docIcons[Math.floor(Math.random() * docIcons.length)]} floating-doc`;
    
    // Random starting position
    doc.style.left = `${Math.random() * 100}vw`;
    
    // Random animation duration between 10-20s
    const duration = 10 + Math.random() * 10;
    doc.style.animationDuration = `${duration}s`;
    
    // Random rotation
    const rotation = Math.random() * 360;
    doc.style.transform = `rotate(${rotation}deg)`;
    
    document.querySelector('.background-animation').appendChild(doc);
    
    // Remove the element when animation ends
    doc.addEventListener('animationend', () => doc.remove());
}

// Create initial set of documents
for (let i = 0; i < 20; i++) {
    setTimeout(createFloatingDoc, Math.random() * 2000);
}

// Continuously create new documents
setInterval(createFloatingDoc, 1000);

// -----------------------------------------------------------------
// -- Frontend JavaScript for handling file uploads and processing
// -----------------------------------------------------------------
const fileInput = document.getElementById('fileInput');
const converterOptions = document.getElementById('converterOptions');
const converterType = document.getElementById('converterType');
const processButton = document.getElementById('processButton');
const markdownOutput = document.getElementById('markdownOutput');
const contentDiv = markdownOutput.querySelector('.content');

// Show converter options only for PDF files
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    const fileName = document.getElementById('fileName');
    fileName.textContent = file ? file.name : 'No file chosen';
    converterOptions.classList.toggle('hidden', !file || !file.name.toLowerCase().endsWith('.pdf'));
});

// Handle file processing
processButton.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file first');
        return;
    }

    markdownOutput.classList.add('loading');
    contentDiv.textContent = '';

    const formData = new FormData();
    formData.append('document', file);
    
    if (file.name.toLowerCase().endsWith('.pdf')) {
        const type = converterType.value;
        console.log('Using converter type:', type);
        formData.append('converterType', type);
    }

    try {
        console.log('Sending request with formData:', {
            fileName: file.name,
            converterType: formData.get('converterType')
        });

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            contentDiv.textContent = data.markdown;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        alert(`Error processing file: ${error.message}`);
        contentDiv.textContent = `Error: ${error.message}`;
    } finally {
        markdownOutput.classList.remove('loading');
    }
});
