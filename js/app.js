/* ========================================================
   HỌC TỪ VỰNG TIẾNG NHẬT N4 — MINNA NO NIHONGO
   Main Application Logic with LocalStorage Progress Tracking
   ======================================================== */

(function () {
    'use strict';

    var STORAGE_KEY = 'minna_vocab_progress_v2';

    // ---- DOM Elements ----
    var controlsSection     = null;
    var categorySelect      = null;
    var limitInput          = null;
    var chipBtns            = null;
    var filterModeSelect    = null;
    var quizModeSelect      = null;
    var startBtn            = null;
    var romajiConvertCheck  = null;
    var resetCatBtn         = null;
    var statUnlearned       = null;
    var statLearned         = null;
    var statReview          = null;

    var quizSection         = null;
    var quizTitle           = null;
    var quizBadge           = null;
    var quizCounter         = null;
    var progressBar         = null;
    var vocabBody           = null;
    var checkBtn            = null;
    var retryWrongBtn       = null;
    var resetBtn            = null;
    var showAnswersBtn      = null;
    var backBtn             = null;

    var resultSection       = null;
    var resultMessage       = null;
    var resultSubtext       = null;
    var resultTrophy        = null;
    var correctCountEl      = null;
    var wrongCountEl        = null;
    var percentageEl        = null;
    var savedProgressText   = null;

    // ---- State ----
    var currentCategory = '';
    var currentData     = [];
    var wrongData       = [];
    var quizMode        = 'nihongo';
    var isChecked       = false;

    // Display labels for quiz columns
    var columnNames = {
        nihongo: 'Tiếng Nhật',
        vietnam: 'Tiếng Việt',
        kanji:   'Kanji',
        hanviet: 'Hán Việt'
    };

    // ========================================================
    //  Initialization
    // ========================================================

    function init() {
        // Cache DOM elements
        controlsSection    = document.getElementById('controls-section');
        categorySelect     = document.getElementById('category-select');
        limitInput         = document.getElementById('limit-input');
        chipBtns           = document.querySelectorAll('.chip-btn');
        filterModeSelect   = document.getElementById('filter-mode-select');
        quizModeSelect     = document.getElementById('quiz-mode-select');
        startBtn           = document.getElementById('start-btn');
        romajiConvertCheck = document.getElementById('romaji-convert-check');
        resetCatBtn        = document.getElementById('reset-cat-btn');
        statUnlearned      = document.getElementById('stat-unlearned');
        statLearned        = document.getElementById('stat-learned');
        statReview         = document.getElementById('stat-review');

        quizSection        = document.getElementById('quiz-section');
        quizTitle          = document.getElementById('quiz-title');
        quizBadge          = document.getElementById('quiz-badge');
        quizCounter        = document.getElementById('quiz-counter');
        progressBar        = document.getElementById('progress-bar');
        vocabBody          = document.getElementById('vocab-body');
        checkBtn           = document.getElementById('check-btn');
        retryWrongBtn      = document.getElementById('retry-wrong-btn');
        resetBtn           = document.getElementById('reset-btn');
        showAnswersBtn     = document.getElementById('show-answers-btn');
        backBtn            = document.getElementById('back-btn');

        resultSection      = document.getElementById('result-section');
        resultMessage      = document.getElementById('result-message');
        resultSubtext      = document.getElementById('result-subtext');
        resultTrophy       = document.getElementById('result-trophy');
        correctCountEl     = document.getElementById('correct-count');
        wrongCountEl       = document.getElementById('wrong-count');
        percentageEl       = document.getElementById('percentage');
        savedProgressText  = document.getElementById('saved-progress-text');

        if (limitInput) {
            limitInput.value = '25';
        }

        populateCategories();
        bindEvents();
        updateCategoryStatsUI();
        initPwaHandlers();
    }

    // ========================================================
    //  PWA Install Prompt & Modal Handling
    // ========================================================
    var deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;
        var pwaDirectBtn = document.getElementById('pwa-direct-install-btn');
        if (pwaDirectBtn) {
            pwaDirectBtn.classList.remove('hidden');
        }
    });

    function initPwaHandlers() {
        var pwaInstallBtn = document.getElementById('pwa-install-btn');
        var pwaModal = document.getElementById('pwa-modal');
        var pwaModalBackdrop = document.getElementById('pwa-modal-backdrop');
        var closePwaModalBtn = document.getElementById('close-pwa-modal-btn');
        var pwaModalDismissBtn = document.getElementById('pwa-modal-dismiss-btn');
        var pwaDirectInstallBtn = document.getElementById('pwa-direct-install-btn');

        function openModal() {
            if (pwaModal) pwaModal.classList.remove('hidden');
        }

        function closeModal() {
            if (pwaModal) pwaModal.classList.add('hidden');
        }

        if (pwaInstallBtn) {
            pwaInstallBtn.addEventListener('click', function () {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then(function (result) {
                        if (result && result.outcome === 'accepted') {
                            console.log('App install accepted');
                        }
                        deferredPrompt = null;
                    });
                } else {
                    openModal();
                }
            });
        }

        if (pwaDirectInstallBtn) {
            pwaDirectInstallBtn.addEventListener('click', function () {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then(function () {
                        deferredPrompt = null;
                        closeModal();
                    });
                }
            });
        }

        if (closePwaModalBtn) closePwaModalBtn.addEventListener('click', closeModal);
        if (pwaModalDismissBtn) pwaModalDismissBtn.addEventListener('click', closeModal);
        if (pwaModalBackdrop) pwaModalBackdrop.addEventListener('click', closeModal);
    }

    // ========================================================
    //  LocalStorage Progress Management
    // ========================================================

    function getWordKey(category, word) {
        return category + '__' + word.nihongo + '__' + (word.kanji || '—');
    }

    function loadProgress() {
        try {
            var data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    function saveProgress(progress) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        } catch (e) {}
    }

    function getWordStatus(progress, category, word) {
        var k = getWordKey(category, word);
        return progress[k] ? progress[k].status : 'unlearned'; // 'unlearned' | 'learned' | 'review'
    }

    function getCategoryProgress(category) {
        var progress = loadProgress();
        var items = vocabData[category] || [];
        var unlearned = 0;
        var learned = 0;
        var review = 0;

        items.forEach(function (it) {
            var st = getWordStatus(progress, category, it);
            if (st === 'learned') learned++;
            else if (st === 'review') review++;
            else unlearned++;
        });

        return {
            total: items.length,
            unlearned: unlearned,
            learned: learned,
            review: review
        };
    }

    function updateCategoryStatsUI() {
        if (!categorySelect) return;
        var cat = categorySelect.value;
        var stats = getCategoryProgress(cat);
        if (statUnlearned) statUnlearned.textContent = stats.unlearned;
        if (statLearned) statLearned.textContent = stats.learned;
        if (statReview) statReview.textContent = stats.review;
    }

    // ========================================================
    //  Populate Category Dropdown
    // ========================================================

    function populateCategories() {
        categorySelect.innerHTML = '';
        for (var key in categoryLabels) {
            if (categoryLabels.hasOwnProperty(key)) {
                var list = vocabData[key] || [];
                var option = document.createElement('option');
                option.value = key;
                option.textContent = categoryLabels[key] + ' (' + list.length + ' từ)';
                categorySelect.appendChild(option);
            }
        }
    }

    // ========================================================
    //  Event Bindings
    // ========================================================

    function bindEvents() {
        categorySelect.addEventListener('change', updateCategoryStatsUI);

        startBtn.addEventListener('click', function () {
            startQuiz(false);
        });

        checkBtn.addEventListener('click', checkAnswers);
        resetBtn.addEventListener('click', resetQuiz);
        showAnswersBtn.addEventListener('click', revealAllAnswers);
        backBtn.addEventListener('click', goBack);

        // Reset progress of currently selected category
        resetCatBtn.addEventListener('click', function () {
            var cat = categorySelect.value;
            var catName = categoryLabels[cat] || 'bộ từ này';
            var msg = 'Bạn có chắc chắn muốn xóa tiến độ của ' + catName + ' để học lại từ đầu?';
            if (window.confirm(msg)) {
                var progress = loadProgress();
                var items = vocabData[cat] || [];
                items.forEach(function (it) {
                    delete progress[getWordKey(cat, it)];
                });
                saveProgress(progress);
                updateCategoryStatsUI();
                alert('Đã đặt lại tiến độ của ' + catName + ' thành công!');
            }
        });

        retryWrongBtn.addEventListener('click', function () {
            if (wrongData.length > 0) {
                currentData = shuffleArray(wrongData.slice());
                currentData.forEach(function (w) {
                    w._checked = false;
                    w._hadWrong = false;
                });
                wrongData = [];
                hide(retryWrongBtn);
                renderTable();
                hide(resultSection);
                isChecked = false;
                window.scrollTo({ top: quizSection.offsetTop - 20, behavior: 'smooth' });
            }
        });

        // Quick limit chip buttons
        chipBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                chipBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var val = btn.getAttribute('data-val');
                limitInput.value = val;
            });
        });

        if (limitInput) {
            limitInput.addEventListener('input', function () {
                var val = limitInput.value.trim();
                chipBtns.forEach(function (b) {
                    if (b.getAttribute('data-val') === val) {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });
            });
        }
    }

    // ========================================================
    //  Shuffle (Fisher-Yates) — TỰ ĐỘNG XÁO TRỘN
    // ========================================================

    function shuffleArray(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = a[i];
            a[i] = a[j];
            a[j] = temp;
        }
        return a;
    }

    // ========================================================
    //  Katakana <-> Hiragana Converter (FIX BUG KATAKANA)
    // ========================================================

    function katakanaToHiragana(str) {
        if (!str) return '';
        return str.replace(/[\u30a1-\u30f6]/g, function (ch) {
            return String.fromCharCode(ch.charCodeAt(0) - 0x60);
        });
    }

    // ========================================================
    //  Romaji to Hiragana Converter
    // ========================================================

    function romajiToHiragana(str) {
        if (!str) return '';
        var s = str.toLowerCase().trim();
        s = s.replace(/~/g, '～').replace(/[-–—_]/g, 'ー');

        // Double consonants (sokuon: kk, tt, ss, pp, etc. except nn)
        s = s.replace(/([bcdfghjklmpqrstvwxyz])\1/g, function (match, char) {
            if (char === 'n') return 'nn';
            return 'っ' + char;
        });

        var table = [
            ['kya', 'きゃ'], ['kyu', 'きゅ'], ['kyo', 'きょ'],
            ['sha', 'しゃ'], ['shu', 'しゅ'], ['sho', 'しょ'],
            ['cha', 'ちゃ'], ['chu', 'ちゅ'], ['cho', 'ちょ'],
            ['nya', 'にゃ'], ['nyu', 'にゅ'], ['nyo', 'にょ'],
            ['hya', 'ひゃ'], ['hyu', 'ひゅ'], ['hyo', 'ひょ'],
            ['mya', 'みゃ'], ['myu', 'みゅ'], ['myo', 'みょ'],
            ['rya', 'りゃ'], ['ryu', 'りゅ'], ['ryo', 'りょ'],
            ['gya', 'ぎゃ'], ['gyu', 'ぎゅ'], ['gyo', 'ぎょ'],
            ['bya', 'びゃ'], ['byu', 'びゅ'], ['byo', 'びょ'],
            ['pya', 'ぴゃ'], ['pyu', 'ぴゅ'], ['pyo', 'ぴょ'],
            ['ja', 'じゃ'], ['ju', 'じゅ'], ['jo', 'じょ'],
            ['jya', 'じゃ'], ['jyu', 'じゅ'], ['jyo', 'じょ'],
            ['shi', 'し'], ['chi', 'ち'], ['tsu', 'つ'], ['fu', 'ふ'],
            ['ka', 'か'], ['ki', 'き'], ['ku', 'く'], ['ke', 'け'], ['ko', 'こ'],
            ['sa', 'さ'], ['su', 'す'], ['se', 'せ'], ['so', 'そ'],
            ['ta', 'た'], ['te', 'て'], ['to', 'と'],
            ['na', 'な'], ['ni', 'に'], ['nu', 'ぬ'], ['ne', 'ね'], ['no', 'の'],
            ['ha', 'は'], ['hi', 'ひ'], ['he', 'へ'], ['ho', 'ほ'],
            ['ma', 'ま'], ['mi', 'み'], ['mu', 'む'], ['me', 'め'], ['mo', 'も'],
            ['ya', 'や'], ['yu', 'ゆ'], ['yo', 'よ'],
            ['ra', 'ら'], ['ri', 'り'], ['ru', 'る'], ['re', 'れ'], ['ro', 'ろ'],
            ['wa', 'わ'], ['wo', 'を'],
            ['ga', 'が'], ['gi', 'ぎ'], ['gu', 'ぐ'], ['ge', 'げ'], ['go', 'ご'],
            ['za', 'ざ'], ['ji', 'じ'], ['zu', 'ず'], ['ze', 'ぜ'], ['zo', 'ぞ'],
            ['da', 'だ'], ['di', 'ぢ'], ['du', 'づ'], ['de', 'đ'],
            ['ba', 'ば'], ['bi', 'び'], ['bu', 'ぶ'], ['be', 'べ'], ['bo', 'ぼ'],
            ['pa', 'ぱ'], ['pi', 'ぴ'], ['pu', 'ぷ'], ['pe', 'ぺ'], ['po', 'ぽ'],
            ['a', 'あ'], ['i', 'い'], ['u', 'う'], ['e', 'え'], ['o', 'お'],
            ['nn', 'ん'], ["n'", 'ん']
        ];

        for (var i = 0; i < table.length; i++) {
            s = s.split(table[i][0]).join(table[i][1]);
        }
        s = s.replace(/n(?=[^aeiouy\s]|$)/g, 'ん');
        return s;
    }

    // ========================================================
    //  Speech Synthesis (Native Pronunciation)
    // ========================================================

    function speakJapanese(text) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        var cleanText = text.replace(/^[～~]/, '').trim();
        var utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }

    // ========================================================
    //  Start Quiz (XỬ LÝ DROPDOWN CHẾ ĐỘ VÀ CỘT HỌC)
    // ========================================================

    function startQuiz(isRetry) {
        currentCategory = categorySelect.value;
        quizMode = quizModeSelect ? quizModeSelect.value : 'nihongo';

        if (!isRetry) {
            var rawList = (vocabData[currentCategory] || []).map(function (item) {
                return {
                    nihongo: item.nihongo,
                    vietnam: item.vietnam,
                    kanji:   item.kanji,
                    hanviet: item.hanviet
                };
            });

            // Lọc theo Chế độ tiến độ
            var filterMode = filterModeSelect ? filterModeSelect.value : 'unlearned';
            var progress = loadProgress();

            var filteredList = [];
            if (filterMode === 'unlearned') {
                filteredList = rawList.filter(function (it) {
                    return getWordStatus(progress, currentCategory, it) === 'unlearned';
                });
                if (filteredList.length === 0) {
                    alert('🎉 Chúc mừng bạn!\nBạn đã học hết toàn bộ từ mới trong ' + categoryLabels[currentCategory] + ' rồi!\nHãy chuyển sang chế độ "Ôn từ đã thuộc" hoặc "Học kèm từ cũ" để củng cố nhé.');
                    return;
                }
            } else if (filterMode === 'review') {
                filteredList = rawList.filter(function (it) {
                    return getWordStatus(progress, currentCategory, it) === 'review';
                });
                if (filteredList.length === 0) {
                    alert('🌟 Tuyệt vời! Bạn không có từ nào cần ôn (không có từ nào bị sai trước đó trong bộ này).');
                    return;
                }
            } else if (filterMode === 'learned') {
                filteredList = rawList.filter(function (it) {
                    return getWordStatus(progress, currentCategory, it) === 'learned';
                });
                if (filteredList.length === 0) {
                    alert('Bạn chưa có từ nào đạt trạng thái "Đã thuộc" trong bộ này. Hãy chọn "Chỉ học từ MỚI" trước nhé!');
                    return;
                }
            } else {
                // 'all': HỌC KÈM CẢ MỚI VÀ CŨ
                filteredList = rawList.slice();
            }

            // Tự động xáo trộn ngẫu nhiên
            filteredList = shuffleArray(filteredList);

            // Áp dụng số lượng từ người dùng điền vào ô
            if (limitInput) {
                var limitVal = limitInput.value.trim();
                if (limitVal !== '') {
                    var parsedLimit = parseInt(limitVal, 10);
                    if (!isNaN(parsedLimit) && parsedLimit > 0) {
                        filteredList = filteredList.slice(0, parsedLimit);
                    }
                }
            }

            currentData = filteredList;
        }

        wrongData = [];
        isChecked = false;
        hide(retryWrongBtn);

        currentData.forEach(function (w) {
            w._checked = false;
            w._hadWrong = false;
        });

        // Update headers
        quizTitle.textContent = categoryLabels[currentCategory] || 'Từ vựng';
        quizBadge.textContent = 'Đang học: ' + columnNames[quizMode];
        quizCounter.textContent = '0 / ' + currentData.length + ' từ';
        updateProgress();

        renderTable();
        show(quizSection);
        hide(controlsSection);
        hide(resultSection);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ========================================================
    //  Update Progress Bar (Theo số câu đã làm đúng)
    // ========================================================

    function updateProgress() {
        var allInputs = document.querySelectorAll('.quiz-input');
        var total = allInputs.length;
        if (total === 0) {
            progressBar.style.width = '0%';
            quizCounter.textContent = '0 / ' + currentData.length + ' từ';
            return;
        }

        var completed = 0;
        allInputs.forEach(function (inp) {
            if (inp.disabled && inp.classList.contains('input-correct')) {
                completed++;
            }
        });

        var pct = Math.round((completed / total) * 100);
        progressBar.style.width = pct + '%';
        quizCounter.textContent = completed + ' / ' + total + ' từ đúng';
    }

    // ========================================================
    //  Procedural Audio Feedback & Visual Shake
    // ========================================================

    function playBeep(type) {
        try {
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            var ctx = new AudioContext();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            var now = ctx.currentTime;
            if (type === 'correct') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                osc.start(now);
                osc.stop(now + 0.22);
            } else if (type === 'wrong') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(260, now);
                osc.frequency.setValueAtTime(180, now + 0.08);
                gain.gain.setValueAtTime(0.14, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            }
        } catch (e) {}
    }

    function triggerShake(el) {
        if (!el) return;
        el.classList.remove('shake-anim');
        void el.offsetWidth; // trigger reflow
        el.classList.add('shake-anim');
    }

    // ========================================================
    //  Chuyển Focus Sang Câu Chưa Làm Kế Tiếp
    // ========================================================

    function focusNextInput(currentInput) {
        var allInputs = Array.prototype.slice.call(
            document.querySelectorAll('.quiz-input')
        );
        var currentIndex = allInputs.indexOf(currentInput);

        var nextInput = null;
        // Tìm tiếp từ ô hiện tại trở đi
        for (var i = currentIndex + 1; i < allInputs.length; i++) {
            if (!allInputs[i].disabled) {
                nextInput = allInputs[i];
                break;
            }
        }

        // Nếu phía sau đã hết, tìm lại từ đầu
        if (!nextInput) {
            for (var j = 0; j < currentIndex; j++) {
                if (!allInputs[j].disabled) {
                    nextInput = allInputs[j];
                    break;
                }
            }
        }

        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        } else {
            // Toàn bộ các câu đều đã trả lời chính xác!
            checkAnswers();
        }
    }

    // ========================================================
    //  Kiểm Tra Tức Thì 1 Câu Khi Nhấn Enter
    //  Ý TƯỞNG 2: SAI THÌ RUNG ĐỎ VÀ BẮT GÕ LẠI, TUYỆT ĐỐI KHÔNG HIỆN ĐÁP ÁN!
    // ========================================================

    function checkSingleInput(input) {
        if (!input || input.disabled) return;

        var answer     = input.getAttribute('data-answer');
        var userAnswer = input.value.trim();
        var rowIndex   = parseInt(input.getAttribute('data-index'), 10);
        var td         = input.parentElement;
        var word       = currentData[rowIndex];

        // Nếu ô đang để trống: rung nhẹ báo hiệu cần nhập
        if (!userAnswer) {
            triggerShake(input);
            input.focus();
            return;
        }

        var correctMatch = isMatch(userAnswer, answer, quizMode);

        if (correctMatch) {
            // ĐÚNG 🟢
            playBeep('correct');

            input.classList.remove('input-wrong', 'shake-anim');
            input.classList.add('input-correct');
            td.classList.remove('cell-wrong');
            td.classList.add('cell-correct');
            input.disabled = true;

            if (word) {
                word._checked = true;
                var progress = loadProgress();
                var k = getWordKey(currentCategory, word);
                var prev = progress[k] || { correct: 0, wrong: 0 };

                if (word._hadWrong) {
                    // Câu này từng bị gõ sai trước đó trong lượt này
                    progress[k] = {
                        status: 'review',
                        correct: prev.correct || 0,
                        wrong: (prev.wrong || 0) + 1,
                        updatedAt: Date.now()
                    };
                } else {
                    // Đúng ngay từ lần gõ đầu tiên
                    progress[k] = {
                        status: 'learned',
                        correct: (prev.correct || 0) + 1,
                        wrong: prev.wrong || 0,
                        updatedAt: Date.now()
                    };
                }
                saveProgress(progress);
                updateCategoryStatsUI();
            }

            updateProgress();

            // Tự động nhảy con trỏ chuột sang ô chưa hoàn thành tiếp theo
            focusNextInput(input);
        } else {
            // SAI 🔴 — TUYỆT ĐỐI KHÔNG HIỆN ĐÁP ÁN ĐÚNG!
            playBeep('wrong');

            if (word) {
                word._hadWrong = true;
                if (wrongData.indexOf(word) === -1) {
                    wrongData.push(word);
                }

                var progressWrong = loadProgress();
                var kw = getWordKey(currentCategory, word);
                var prevW = progressWrong[kw] || { correct: 0, wrong: 0 };
                progressWrong[kw] = {
                    status: 'review',
                    correct: prevW.correct || 0,
                    wrong: (prevW.wrong || 0) + 1,
                    updatedAt: Date.now()
                };
                saveProgress(progressWrong);
                updateCategoryStatsUI();
            }

            input.classList.remove('input-correct');
            input.classList.add('input-wrong');
            td.classList.remove('cell-correct');
            td.classList.add('cell-wrong');

            // Rung nhẹ ô input
            triggerShake(input);

            // Giữ nguyên con trỏ tại ô đó và bôi đen để người dùng tự sửa lại
            input.focus();
            input.select();
        }
    }

    // ========================================================
    //  Render Table
    // ========================================================

    function renderTable() {
        vocabBody.innerHTML = '';
        var columns = ['nihongo', 'vietnam', 'kanji', 'hanviet'];

        currentData.forEach(function (word, index) {
            var tr = document.createElement('tr');

            // STT column
            var tdStt = document.createElement('td');
            tdStt.className = 'td-stt';
            tdStt.textContent = String(index + 1);
            tr.appendChild(tdStt);

            columns.forEach(function (col) {
                var td = document.createElement('td');
                var cellValue = word[col] || '';

                if (col === quizMode) {
                    td.className = 'input-cell';

                    if (!cellValue || cellValue === '—' || cellValue === '-') {
                        td.textContent = '—';
                        td.className = 'td-empty';
                    } else {
                        var input = document.createElement('input');
                        input.type = 'text';
                        input.className = 'quiz-input';
                        input.setAttribute('data-answer', cellValue);
                        input.setAttribute('data-index', String(index));
                        input.placeholder = 'Nhập ' + columnNames[col] + '...';
                        input.setAttribute('autocomplete', 'off');
                        input.setAttribute('autocorrect', 'off');
                        input.setAttribute('autocapitalize', 'off');
                        input.setAttribute('spellcheck', 'false');

                        // Xử lý khi gõ chữ
                        input.addEventListener('input', function (e) {
                            if (col === 'nihongo') {
                                if (romajiConvertCheck && romajiConvertCheck.checked) {
                                    var original = e.target.value;
                                    var converted = romajiToHiragana(original);
                                    if (converted !== original) {
                                        e.target.value = converted;
                                    }
                                }
                            }
                            // Khi đang sửa lại từ bị sai, xóa viền đỏ để gõ thoải mái
                            if (input.classList.contains('input-wrong')) {
                                input.classList.remove('input-wrong', 'shake-anim');
                                td.classList.remove('cell-wrong');
                            }
                            updateProgress();
                        });

                        // Nhấn Enter kiểm tra tức thì
                        input.addEventListener('keydown', function (e) {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (e.shiftKey) {
                                    // Shift + Enter: bỏ qua sang câu tiếp theo
                                    focusNextInput(input);
                                } else {
                                    // Enter: Kiểm tra tức thì câu này!
                                    checkSingleInput(input);
                                }
                            }
                        });

                        td.appendChild(input);
                    }
                } else {
                    td.className = 'td-' + col;

                    if (col === 'nihongo') {
                        var wrapper = document.createElement('div');
                        wrapper.className = 'nihongo-wrapper';

                        var textSpan = document.createElement('span');
                        textSpan.textContent = cellValue;
                        wrapper.appendChild(textSpan);

                        var speakerBtn = document.createElement('button');
                        speakerBtn.className = 'btn-speaker';
                        speakerBtn.type = 'button';
                        speakerBtn.title = 'Nghe phát âm tiếng Nhật';
                        speakerBtn.innerHTML = '🔊';
                        speakerBtn.addEventListener('click', function (e) {
                            e.stopPropagation();
                            speakJapanese(cellValue);
                        });
                        wrapper.appendChild(speakerBtn);
                        td.appendChild(wrapper);
                    } else {
                        td.textContent = cellValue;
                        if (cellValue === '—' || cellValue === '-') {
                            td.className = 'td-empty';
                        }
                    }
                }

                tr.appendChild(td);
            });

            vocabBody.appendChild(tr);
        });

        requestAnimationFrame(function () {
            var firstInput = document.querySelector('.quiz-input');
            if (firstInput) firstInput.focus();
        });

        updateProgress();
    }

    // ========================================================
    //  Candidate Answer Extraction & Normalization
    // ========================================================

    function normalizeText(text) {
        if (!text) return '';
        return text
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[\s\u3000]+/g, '')
            .replace(/[~～]/g, '')
            .replace(/[-–—_]/g, 'ー')
            .replace(/[.,:;?!/\\()\[\]'"`]/g, '');
    }

    function normalizeJapaneseText(text) {
        if (!text) return '';
        var s = text.toString().trim().toLowerCase();
        s = romajiToHiragana(s);
        s = katakanaToHiragana(s);
        s = s.replace(/[\s\u3000]+/g, '')
             .replace(/[~～]/g, '')
             .replace(/[-–—_]/g, 'ー')
             .replace(/[.,:;?!/\\()\[\]'"`]/g, '');
        return s;
    }

    function getAnswerCandidates(rawAnswer) {
        if (!rawAnswer) return [];
        var list = [rawAnswer];

        var parts = rawAnswer.split(/[/,;、，]/);
        parts.forEach(function (part) {
            var trimmed = part.trim();
            if (trimmed) {
                list.push(trimmed);

                var withoutParen = trimmed.replace(/\([^)]*\)/g, '').trim();
                if (withoutParen && withoutParen !== trimmed) {
                    list.push(withoutParen);
                }

                var match = trimmed.match(/\(([^)]+)\)/);
                if (match && match[1]) {
                    list.push(match[1].trim());
                }
            }
        });

        return list;
    }

    function isMatch(userAnswer, rawAnswer, mode) {
        if (!userAnswer || !rawAnswer) return false;

        // Nếu đang học Tiếng Nhật: chuẩn hóa cả Hiragana, Katakana, Romaji
        if (mode === 'nihongo') {
            var normUserJp = normalizeJapaneseText(userAnswer);
            if (!normUserJp) return false;

            var candidatesJp = getAnswerCandidates(rawAnswer);
            for (var j = 0; j < candidatesJp.length; j++) {
                var normCandJp = normalizeJapaneseText(candidatesJp[j]);
                if (normUserJp === normCandJp) return true;
            }
            return false;
        }

        // Với các cột khác (Tiếng Việt, Kanji, Hán Việt)
        var normUser = normalizeText(userAnswer);
        if (!normUser) return false;

        var candidates = getAnswerCandidates(rawAnswer);
        for (var i = 0; i < candidates.length; i++) {
            var normCand = normalizeText(candidates[i]);
            if (normUser === normCand) return true;
        }

        return false;
    }

    // ========================================================
    //  Check Answers & Save Progress to LocalStorage
    // ========================================================

    function checkAnswers() {
        if (isChecked) return;
        isChecked = true;

        var inputs = document.querySelectorAll('.quiz-input');
        var correct = 0;
        var wrong   = 0;
        wrongData   = [];

        var progress = loadProgress();

        inputs.forEach(function (input) {
            var answer     = input.getAttribute('data-answer');
            var userAnswer = input.value;
            var rowIndex   = parseInt(input.getAttribute('data-index'), 10);
            var td         = input.parentElement;
            var word       = currentData[rowIndex];

            var correctMatch = isMatch(userAnswer, answer, quizMode);

            if (correctMatch) {
                // ĐÚNG MÀU XANH
                input.classList.remove('input-wrong', 'shake-anim');
                input.classList.add('input-correct');
                td.classList.remove('cell-wrong');
                td.classList.add('cell-correct');
                input.disabled = true;

                if (word && word._hadWrong) {
                    wrong++;
                    if (wrongData.indexOf(word) === -1) {
                        wrongData.push(word);
                    }
                } else {
                    correct++;
                }

                // Cập nhật trạng thái "Đã thuộc" nếu đúng ngay từ đầu
                if (word && !word._hadWrong) {
                    var k = getWordKey(currentCategory, word);
                    var prev = progress[k] || { correct: 0, wrong: 0 };
                    progress[k] = {
                        status: 'learned',
                        correct: (prev.correct || 0) + 1,
                        wrong: prev.wrong || 0,
                        updatedAt: Date.now()
                    };
                }
            } else {
                // SAI MÀU ĐỎ — TUYỆT ĐỐI KHÔNG HIỆN ĐÁP ÁN ĐÚNG!
                input.classList.remove('input-correct');
                input.classList.add('input-wrong');
                td.classList.remove('cell-correct');
                td.classList.add('cell-wrong');
                wrong++;

                // Cập nhật trạng thái "Cần ôn lại" (review)
                if (word) {
                    word._hadWrong = true;
                    if (wrongData.indexOf(word) === -1) {
                        wrongData.push(word);
                    }
                    var kw = getWordKey(currentCategory, word);
                    var prevW = progress[kw] || { correct: 0, wrong: 0 };
                    progress[kw] = {
                        status: 'review',
                        correct: prevW.correct || 0,
                        wrong: (prevW.wrong || 0) + 1,
                        updatedAt: Date.now()
                    };
                }
                // TUYỆT ĐỐI KHÔNG HIỆN ĐÁP ÁN ĐÚNG!
            }

            input.disabled = true;
        });

        // Lưu tiến độ vào LocalStorage
        saveProgress(progress);
        updateCategoryStatsUI();

        // Update stats
        var total = correct + wrong;
        var pct   = total > 0 ? Math.round((correct / total) * 100) : 0;

        correctCountEl.textContent = String(correct);
        wrongCountEl.textContent   = String(wrong);
        percentageEl.textContent   = pct + '%';

        // Custom trophy and congratulation message
        if (pct === 100) {
            resultTrophy.textContent = '🏆';
            resultMessage.textContent = 'Hoàn hảo tuyệt đối 100%! Xuất sắc!';
            resultSubtext.textContent = 'Toàn bộ từ trong bài đã được đánh dấu là "Đã thuộc" vào bộ nhớ!';
        } else if (pct >= 80) {
            resultTrophy.textContent = '🌟';
            resultMessage.textContent = 'Làm rất tốt! Bạn đã nắm chắc kiến thức!';
            resultSubtext.textContent = 'Các từ đúng đã được ghi nhận thuộc, từ sai sẽ được lưu vào mục "Cần ôn".';
        } else if (pct >= 50) {
            resultTrophy.textContent = '👍';
            resultMessage.textContent = 'Khá tốt! Hãy tiếp tục luyện tập nhé!';
            resultSubtext.textContent = 'Bấm "Ôn lại các câu sai" để củng cố ngay những từ chưa thuộc.';
        } else {
            resultTrophy.textContent = '💪';
            resultMessage.textContent = 'Đừng nản lòng! Vạn sự khởi đầu nan!';
            resultSubtext.textContent = 'Các từ sai đã được lưu lại để bạn có thể ôn riêng sau này.';
        }

        // Cập nhật banner tổng tiến độ đã lưu
        var updatedStats = getCategoryProgress(currentCategory);
        if (savedProgressText) {
            savedProgressText.innerHTML = '💾 <strong>Đã lưu tiến độ vào máy!</strong> ' + 
                categoryLabels[currentCategory] + ' hiện có: <strong>' + updatedStats.learned + '</strong> từ đã thuộc, ' +
                '<strong>' + updatedStats.review + '</strong> từ cần ôn, còn <strong>' + updatedStats.unlearned + '</strong> từ mới.';
        }

        if (wrongData.length > 0) {
            retryWrongBtn.querySelector('.btn-icon').textContent = '🔁';
            retryWrongBtn.childNodes[1].textContent = ' Ôn Lại ' + wrongData.length + ' Câu Sai';
            show(retryWrongBtn);
        } else {
            hide(retryWrongBtn);
        }

        show(resultSection);
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ========================================================
    //  Reveal All Answers
    // ========================================================

    function revealAllAnswers() {
        var inputs = document.querySelectorAll('.quiz-input');
        inputs.forEach(function (input) {
            var answer = input.getAttribute('data-answer');
            var td     = input.parentElement;

            if (!input.disabled) {
                input.value = answer;
                input.disabled = true;
                td.classList.add('cell-correct');
                input.classList.add('input-correct');
            }
        });
        isChecked = true;
        hide(resultSection);
    }

    // ========================================================
    //  Reset Quiz
    // ========================================================

    function resetQuiz() {
        isChecked = false;
        wrongData = [];
        hide(retryWrongBtn);

        currentData = shuffleArray(currentData);
        currentData.forEach(function (w) {
            w._checked = false;
            w._hadWrong = false;
        });

        renderTable();
        hide(resultSection);
        window.scrollTo({ top: quizSection.offsetTop - 20, behavior: 'smooth' });
    }

    // ========================================================
    //  Go Back to Settings
    // ========================================================

    function goBack() {
        hide(quizSection);
        hide(resultSection);
        show(controlsSection);
        updateCategoryStatsUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ========================================================
    //  Helpers
    // ========================================================

    function show(el) { if (el) el.classList.remove('hidden'); }
    function hide(el) { if (el) el.classList.add('hidden'); }

    // ========================================================
    //  Boot
    // ========================================================

    document.addEventListener('DOMContentLoaded', init);

})();
