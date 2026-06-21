document.addEventListener("DOMContentLoaded", () => {
    displayWords();
    // Sahifa yuklanganda ovozlarni majburlab yuklatish
    initVoices();
});

let words = JSON.parse(localStorage.getItem("words")) || [];
let isPlaying = false;
let currentPlaylistIndex = 0;
let allVoices = [];

// Ovozlar ro'yxatini brauzerdan kafolatlangan tarzda yuklash
function initVoices() {
    allVoices = window.speechSynthesis.getVoices();
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
            allVoices = window.speechSynthesis.getVoices();
        };
    }
}

// Nemischa ovozni qat'iy va majburiy topish funksiyasi
function getGermanVoice() {
    if (allVoices.length === 0) {
        allVoices = window.speechSynthesis.getVoices();
    }
    
    // 1. Birinchi navbatda Google Chrome'ning maxsus toza nemischa ovozini qidiramiz
    let googleGerman = allVoices.find(v => v.lang === 'de-DE' && v.name.includes('Google'));
    if (googleGerman) return googleGerman;

    // 2. Har qanday standart nemischa (de-DE, de-AT, de-CH) ovozni qidiramiz
    let standardGerman = allVoices.find(v => v.lang.toLowerCase().startsWith('de'));
    if (standardGerman) return standardGerman;

    return null;
}

// O'zbekcha uchun eng yaqin muqobil ovoz (Masalan Turkcha tr-TR)
function getUzbekVoice() {
    if (allVoices.length === 0) {
        allVoices = window.speechSynthesis.getVoices();
    }
    return allVoices.find(v => v.lang.toLowerCase().startsWith('tr')) || null;
}

// Alohida eshitish tugmasi uchun (Kafolatlangan nemischa bilan)
function speakAlone(text, lang) {
    window.speechSynthesis.cancel(); // Har qanday chala qolgan ovozni to'xtatish
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (lang.startsWith('de')) {
        const deVoice = getGermanVoice();
        if (deVoice) {
            utterance.voice = deVoice;
        }
        utterance.lang = 'de-DE';
    } else if (lang.startsWith('uz')) {
        const uzVoice = getUzbekVoice();
        if (uzVoice) {
            utterance.voice = uzVoice;
        }
        utterance.lang = 'tr-TR'; // O'zbekcha yozuvni turkcha ohangda o'qiydi (chiroyli chiqadi)
    }
    
    window.speechSynthesis.speak(utterance);
}

// Playlist ichida ketma-ketlikni boshqaradigan funksiya
function speakTimeout(text, lang) {
    return new Promise((resolve) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        if (lang.startsWith('de')) {
            const deVoice = getGermanVoice();
            if (deVoice) utterance.voice = deVoice;
            utterance.lang = 'de-DE';
        } else if (lang.startsWith('uz')) {
            const uzVoice = getUzbekVoice();
            if (uzVoice) utterance.voice = uzVoice;
            utterance.lang = 'tr-TR';
        }

        const backupTimeout = setTimeout(() => {
            resolve();
        }, 4000); // Agar qotib qolsa, maksimal 4 soniyadan keyin o'tadi

        utterance.onend = () => {
            clearTimeout(backupTimeout);
            resolve();
        };
        
        utterance.onerror = () => {
            clearTimeout(backupTimeout);
            resolve();
        };
        
        window.speechSynthesis.speak(utterance);
    });
}

// --- Qolgan funksiyalar (O'zgarishsiz qoldi, muammosiz ishlashi uchun hammasi bitta joyda) ---

async function translateWord() {
    const germanText = document.getElementById("germanWord").value.trim();
    const uzbekInput = document.getElementById("uzbekWord");

    if (germanText === "") {
        alert("Iltimos, oldin nemischa so'zni yozing!");
        return;
    }

    const translateBtn = document.querySelector(".translate-btn");
    translateBtn.innerText = "🔄 Tarjima qilinmoqda...";
    translateBtn.disabled = true;

    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(germanText)}&langpair=de|uz`);
        const data = await response.json();

        if (data.responseData && data.responseData.translatedText) {
            let translated = data.responseData.translatedText;
            if (translated.toLowerCase() === germanText.toLowerCase()) {
                uzbekInput.value = "";
                alert("O'zbekcha tarjima topilmadi, iltimos o'zingiz yozing.");
            } else {
                uzbekInput.value = translated;
            }
        }
    } catch (error) {
        console.error("Xatolik:", error);
        alert("Tarjima xizmatiga ulanib bo'lmadi.");
    } finally {
        translateBtn.innerText = "⚡ Avto-Tarjima";
        translateBtn.disabled = false;
    }
}

function addWord() {
    const german = document.getElementById("germanWord").value.trim();
    const uzbek = document.getElementById("uzbekWord").value.trim();
    const categorySelect = document.getElementById("categorySelect");
    const category = categorySelect ? categorySelect.value : "Kundalik";

    if (german === "" || uzbek === "") {
        alert("Iltimos, so'zlarni to'ldiring!");
        return;
    }

    const newWord = { id: Date.now(), german, uzbek, category: category === "all" ? "Kundalik" : category };
    words.push(newWord);
    localStorage.setItem("words", JSON.stringify(words));
    
    document.getElementById("germanWord").value = "";
    document.getElementById("uzbekWord").value = "";
    displayWords();
}

function displayWords() {
    const wordList = document.getElementById("wordList");
    const selectedCategory = document.getElementById("categorySelect").value;
    wordList.innerHTML = "";

    const filteredWords = words.filter(w => selectedCategory === "all" || w.category === selectedCategory);

    filteredWords.forEach(word => {
        const li = document.createElement("li");
        li.innerHTML = `
            <span><strong>${word.german}</strong> - ${word.uzbek} <small style="color:gray">(${word.category})</small></span>
            <div>
                <button onclick="speakAlone('${word.german}', 'de-DE')">DE 🔊</button>
                <button onclick="speakAlone('${word.uzbek}', 'uz-UZ')">UZ 🔊</button>
                <button onclick="deleteWord(${word.id})" class="delete-btn">❌</button>
            </div>
        `;
        wordList.appendChild(li);
    });
}

function filterWords() {
    displayWords();
}

async function startPlaylist() {
    const selectedCategory = document.getElementById("categorySelect").value;
    const playlist = words.filter(w => selectedCategory === "all" || w.category === selectedCategory);

    if (playlist.length === 0) {
        alert("Playlistda so'zlar mavjud emas!");
        return;
    }

    isPlaying = true;
    currentPlaylistIndex = 0;
    
    while (isPlaying && currentPlaylistIndex < playlist.length) {
        let currentWord = playlist[currentPlaylistIndex];
        document.getElementById("nowPlaying").innerText = `🎧 O'qilmoqda: ${currentWord.german}`;

        await speakTimeout(currentWord.german, 'de-DE');
        await new Promise(resolve => setTimeout(resolve, 1500)); 

        if (!isPlaying) break;

        await speakTimeout(currentWord.uzbek, 'uz-UZ');
        await new Promise(resolve => setTimeout(resolve, 2000)); 
        
        currentPlaylistIndex++;
    }

    if (isPlaying) {
        document.getElementById("nowPlaying").innerText = "🎉 Playlist tugadi!";
        isPlaying = false;
    }
}

function stopPlaylist() {
    isPlaying = false;
    window.speechSynthesis.cancel();
    document.getElementById("nowPlaying").innerText = "⏸️ Playlist to'xtatildi.";
}

function deleteWord(id) {
    words = words.filter(word => word.id !== id);
    localStorage.setItem("words", JSON.stringify(words));
    displayWords();
}