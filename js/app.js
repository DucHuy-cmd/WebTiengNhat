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

        bindEvents();
        initPwaHandlers();
        initStreakHandlers();
        StreakManager.init();
        initLevelSwitcher();
        initGameHandlers();
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
    //  STREAK MANAGEMENT (CHUỖI NGÀY HỌC — NGỌN LỬA ĐEN / XANH)
    // ========================================================
    var STREAK_KEY = 'webtiengnhat_streak';

    var StreakManager = {
        data: {
            currentStreak: 0,
            bestStreak: 0,
            lastCompletedDate: null,
            todayDate: '',
            todayWordsCount: 0
        },
        _timerInterval: null,

        getLocalDateString: function (d) {
            d = d || new Date();
            var y = d.getFullYear();
            var m = String(d.getMonth() + 1).padStart(2, '0');
            var day = String(d.getDate()).padStart(2, '0');
            return y + '-' + m + '-' + day;
        },

        getYesterdayDateString: function () {
            var d = new Date(Date.now() - 86400000);
            return this.getLocalDateString(d);
        },

        init: function () {
            this.load();
        },

        load: function () {
            try {
                var raw = localStorage.getItem(STREAK_KEY);
                if (raw) {
                    this.data = JSON.parse(raw);
                }
            } catch (e) {
                this.data = {};
            }

            this.data.currentStreak = Number(this.data.currentStreak) || 0;
            this.data.bestStreak = Number(this.data.bestStreak) || 0;
            this.data.lastCompletedDate = this.data.lastCompletedDate || null;
            this.data.todayWordsCount = Number(this.data.todayWordsCount) || 0;

            var todayStr = this.getLocalDateString();
            var yesterdayStr = this.getYesterdayDateString();

            // Kiểm tra chuyển ngày (qua 12h đêm)
            if (this.data.todayDate !== todayStr) {
                // Đã bước sang ngày mới!
                if (this.data.lastCompletedDate === yesterdayStr) {
                    // Ngày hôm qua đã hoàn thành: bảo toàn chuỗi!
                } else if (this.data.lastCompletedDate === todayStr) {
                    // Đã hoàn thành hôm nay
                } else {
                    // Hôm qua không hoàn thành -> ĐỨT CHUỖI! Chuỗi về 0
                    this.data.currentStreak = 0;
                }

                // Sang ngày mới: bộ đếm số từ hôm nay reset về 0
                this.data.todayWordsCount = 0;
                this.data.todayDate = todayStr;
                this.save();
            }

            this.updateUI();
        },

        save: function () {
            try {
                localStorage.setItem(STREAK_KEY, JSON.stringify(this.data));
            } catch (e) {}
        },

        isTodayCompleted: function () {
            var todayStr = this.getLocalDateString();
            return this.data.lastCompletedDate === todayStr && this.data.todayWordsCount >= 20;
        },

        onWordCorrect: function () {
            var todayStr = this.getLocalDateString();
            if (this.data.todayDate !== todayStr) {
                this.load(); // Cập nhật ngày nếu phiên làm việc chuyển qua 12h đêm
            }

            this.data.todayWordsCount = (this.data.todayWordsCount || 0) + 1;

            // Kiểm tra mốc 20 từ để thắp sáng ngọn lửa xanh
            if (this.data.todayWordsCount >= 20 && this.data.lastCompletedDate !== todayStr) {
                this.data.lastCompletedDate = todayStr;
                this.data.currentStreak = (this.data.currentStreak || 0) + 1;
                if (this.data.currentStreak > this.data.bestStreak) {
                    this.data.bestStreak = this.data.currentStreak;
                }
                this.save();
                this.updateUI();
                this.triggerCelebration();
            } else {
                this.save();
                this.updateUI();
            }
        },

        triggerCelebration: function () {
            var modal = document.getElementById('streak-celebration-modal');
            var daysEl = document.getElementById('celebration-streak-days');
            if (daysEl) daysEl.textContent = this.data.currentStreak;
            if (modal) modal.classList.remove('hidden');
            playBeep('correct');
        },

        updateUI: function () {
            var isCompleted = this.isTodayCompleted();
            var btn = document.getElementById('streak-header-btn');
            var countEl = document.getElementById('streak-days-count');
            if (countEl) countEl.textContent = this.data.currentStreak;

            if (btn) {
                if (isCompleted) {
                    btn.classList.remove('flame-black');
                    btn.classList.add('flame-blue');
                    btn.setAttribute('title', '🔥 Chuỗi ' + this.data.currentStreak + ' ngày (Đã thắp sáng hôm nay!)');
                } else {
                    btn.classList.remove('flame-blue');
                    btn.classList.add('flame-black');
                    var remaining = Math.max(0, 20 - (this.data.todayWordsCount || 0));
                    btn.setAttribute('title', '🔥 Chuỗi ' + this.data.currentStreak + ' ngày (Còn ' + remaining + ' từ nữa để thắp sáng)');
                }
            }

            this.updateModal();
        },

        updateModal: function () {
            var modal = document.getElementById('streak-modal');
            if (!modal || modal.classList.contains('hidden')) return;

            var isCompleted = this.isTodayCompleted();
            var circle = document.getElementById('modal-flame-circle');
            var daysEl = document.getElementById('modal-streak-days');
            var statusBadge = document.getElementById('modal-streak-status-badge');
            var progressText = document.getElementById('modal-streak-progress-text');
            var progressFill = document.getElementById('modal-streak-progress-fill');
            var bestStreakEl = document.getElementById('modal-best-streak');
            var todayTotalEl = document.getElementById('modal-total-learned-today');

            if (daysEl) daysEl.textContent = this.data.currentStreak;
            if (bestStreakEl) bestStreakEl.textContent = this.data.bestStreak + ' ngày';
            if (todayTotalEl) todayTotalEl.textContent = (this.data.todayWordsCount || 0) + ' từ';

            var count = this.data.todayWordsCount || 0;
            var pct = Math.min(100, Math.round((count / 20) * 100));

            if (progressText) progressText.textContent = count + ' / 20 từ (' + pct + '%)';
            if (progressFill) progressFill.style.width = pct + '%';

            if (circle) {
                circle.className = 'flame-big-circle ' + (isCompleted ? 'flame-blue' : 'flame-black');
            }

            if (statusBadge) {
                if (isCompleted) {
                    statusBadge.className = 'streak-status-badge status-active';
                    statusBadge.innerHTML = '✨ Đã thắp sáng ngọn lửa xanh hôm nay!';
                } else {
                    statusBadge.className = 'streak-status-badge status-pending';
                    var rem = Math.max(0, 20 - count);
                    statusBadge.innerHTML = '⏳ Còn <strong>' + rem + ' từ</strong> nữa để thắp sáng!';
                }
            }
        },

        startCountdownTimer: function () {
            function updateTimer() {
                var el = document.getElementById('modal-streak-countdown');
                if (!el) return;
                var now = new Date();
                var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
                var diff = Math.max(0, midnight - now);
                var h = Math.floor(diff / 3600000);
                var m = Math.floor((diff % 3600000) / 60000);
                var s = Math.floor((diff % 60000) / 1000);
                el.textContent = (h < 10 ? '0' + h : h) + ' giờ ' + (m < 10 ? '0' + m : m) + ' phút ' + (s < 10 ? '0' + s : s) + ' giây';
            }
            updateTimer();
            if (this._timerInterval) clearInterval(this._timerInterval);
            this._timerInterval = setInterval(updateTimer, 1000);
        },

        stopCountdownTimer: function () {
            if (this._timerInterval) {
                clearInterval(this._timerInterval);
                this._timerInterval = null;
            }
        }
    };

    function initStreakHandlers() {
        var streakHeaderBtn = document.getElementById('streak-header-btn');
        var streakModal = document.getElementById('streak-modal');
        var streakModalBackdrop = document.getElementById('streak-modal-backdrop');
        var closeStreakModalBtn = document.getElementById('close-streak-modal-btn');
        var closeStreakModalBtn2 = document.getElementById('close-streak-modal-btn-2');
        var streakModalStartBtn = document.getElementById('streak-modal-start-btn');

        var celebrationModal = document.getElementById('streak-celebration-modal');
        var celebrationBackdrop = document.getElementById('celebration-backdrop');
        var celebrationCloseBtn = document.getElementById('celebration-close-btn');

        function openStreakModal() {
            if (streakModal) {
                streakModal.classList.remove('hidden');
                StreakManager.updateModal();
                StreakManager.startCountdownTimer();
            }
        }

        function closeStreakModal() {
            if (streakModal) {
                streakModal.classList.add('hidden');
                StreakManager.stopCountdownTimer();
            }
        }

        if (streakHeaderBtn) streakHeaderBtn.addEventListener('click', openStreakModal);
        if (streakModalBackdrop) streakModalBackdrop.addEventListener('click', closeStreakModal);
        if (closeStreakModalBtn) closeStreakModalBtn.addEventListener('click', closeStreakModal);
        if (closeStreakModalBtn2) closeStreakModalBtn2.addEventListener('click', closeStreakModal);

        if (streakModalStartBtn) {
            streakModalStartBtn.addEventListener('click', function () {
                closeStreakModal();
                if (limitInput) {
                    limitInput.value = '20';
                    if (chipBtns) {
                        chipBtns.forEach(function (b) {
                            if (b.getAttribute('data-value') === '20') {
                                b.classList.add('active');
                            } else {
                                b.classList.remove('active');
                            }
                        });
                    }
                }
                if (startBtn) {
                    startBtn.click();
                    var quizSec = document.getElementById('quiz-section');
                    if (quizSec) {
                        quizSec.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        }

        function closeCelebration() {
            if (celebrationModal) celebrationModal.classList.add('hidden');
        }
        if (celebrationBackdrop) celebrationBackdrop.addEventListener('click', closeCelebration);
        if (celebrationCloseBtn) celebrationCloseBtn.addEventListener('click', closeCelebration);
    }

    // ========================================================
    //  Multi-Level Management (JLPT N4 vs JLPT N3)
    // ========================================================
    var currentLevel = 'N4';
    try {
        currentLevel = localStorage.getItem('webtiengnhat_selected_level') || 'N4';
    } catch (e) {}

    // Auto-migrate legacy N4 progress if present
    try {
        if (!localStorage.getItem('webtiengnhat_progress_n4')) {
            var legacy = localStorage.getItem('minna_vocab_progress_v2') || localStorage.getItem('webtiengnhat_progress');
            if (legacy) {
                localStorage.setItem('webtiengnhat_progress_n4', legacy);
            }
        }
    } catch (e) {}

    function getStorageKey() {
        return currentLevel === 'N3' ? 'webtiengnhat_progress_n3' : 'webtiengnhat_progress_n4';
    }

    function getActiveVocabData() {
        if (currentLevel === 'N3' && typeof vocabData_N3 !== 'undefined') {
            return vocabData_N3;
        }
        return typeof vocabData !== 'undefined' ? vocabData : {};
    }

    function getActiveCategoryLabels() {
        if (currentLevel === 'N3' && typeof categoryLabels_N3 !== 'undefined') {
            return categoryLabels_N3;
        }
        return typeof categoryLabels !== 'undefined' ? categoryLabels : {};
    }

    function initLevelSwitcher() {
        var btnN4 = document.getElementById('level-btn-n4');
        var btnN3 = document.getElementById('level-btn-n3');
        var headerTitle = document.getElementById('app-header-title');

        function applyLevel(lvl) {
            currentLevel = lvl;
            try {
                localStorage.setItem('webtiengnhat_selected_level', lvl);
            } catch (e) {}

            if (btnN4) btnN4.classList.toggle('active', lvl === 'N4');
            if (btnN3) btnN3.classList.toggle('active', lvl === 'N3');

            if (headerTitle) {
                headerTitle.textContent = lvl === 'N3' ? 'Học Từ Vựng N3' : 'Học Từ Vựng N4';
            }

            populateCategories();
            updateCategoryStatsUI();

            if ((quizSection && !quizSection.classList.contains('hidden')) ||
                (gameSection && !gameSection.classList.contains('hidden')) ||
                (gameResultSection && !gameResultSection.classList.contains('hidden'))) {
                hide(quizSection);
                if (resultSection) hide(resultSection);
                if (gameSection) hide(gameSection);
                if (gameResultSection) hide(gameResultSection);
                show(controlsSection);
            }
        }

        if (btnN4) {
            btnN4.addEventListener('click', function () {
                if (currentLevel !== 'N4') applyLevel('N4');
            });
        }

        if (btnN3) {
            btnN3.addEventListener('click', function () {
                if (currentLevel !== 'N3') applyLevel('N3');
            });
        }

        applyLevel(currentLevel);
    }

    // ========================================================
    //  LocalStorage Progress Management
    // ========================================================

    function getWordKey(category, word) {
        return category + '__' + word.nihongo + '__' + (word.kanji || '—');
    }

    function loadProgress() {
        try {
            var data = localStorage.getItem(getStorageKey());
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    function saveProgress(progress) {
        try {
            localStorage.setItem(getStorageKey(), JSON.stringify(progress));
        } catch (e) {}
    }

    function getWordStatus(progress, category, word) {
        var k = getWordKey(category, word);
        return progress[k] ? progress[k].status : 'unlearned'; // 'unlearned' | 'learned' | 'review'
    }

    function getCategoryProgress(category) {
        var progress = loadProgress();
        var allData = getActiveVocabData();
        var items = allData[category] || [];
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
        var labels = getActiveCategoryLabels();
        var data = getActiveVocabData();
        for (var key in labels) {
            if (labels.hasOwnProperty(key)) {
                var list = data[key] || [];
                var option = document.createElement('option');
                option.value = key;
                option.textContent = labels[key] + ' (' + list.length + ' từ)';
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

        if (checkBtn) {
            checkBtn.addEventListener('click', checkAnswers);
        }
        resetBtn.addEventListener('click', resetQuiz);
        showAnswersBtn.addEventListener('click', revealAllAnswers);
        backBtn.addEventListener('click', goBack);

        // Reset progress of currently selected category
        resetCatBtn.addEventListener('click', function () {
            var cat = categorySelect.value;
            var catName = getActiveCategoryLabels()[cat] || 'bộ từ này';
            var msg = 'Bạn có chắc chắn muốn xóa tiến độ của ' + catName + ' (' + currentLevel + ') để học lại từ đầu?';
            if (window.confirm(msg)) {
                var progress = loadProgress();
                var items = getActiveVocabData()[cat] || [];
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
        var s = str.toLowerCase();
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
            ['da', 'だ'], ['di', 'ぢ'], ['du', 'づ'], ['de', 'で'], ['do', 'ど'],
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
            var rawList = (getActiveVocabData()[currentCategory] || []).map(function (item) {
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
                    alert('🎉 Chúc mừng bạn!\nBạn đã học hết toàn bộ từ mới trong ' + getActiveCategoryLabels()[currentCategory] + ' rồi!\nHãy chuyển sang chế độ "Ôn từ đã thuộc" hoặc "Học kèm từ cũ" để củng cố nhé.');
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
        quizTitle.textContent = getActiveCategoryLabels()[currentCategory] || 'Từ vựng';
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
    //  Kiểm Tra Đã Hoàn Thành Toàn Bộ Bài Hay Chưa
    // ========================================================

    function checkIfAllCompleted() {
        var allInputs = document.querySelectorAll('.quiz-input');
        if (allInputs.length === 0) return;
        var uncompleted = 0;
        allInputs.forEach(function (inp) {
            if (!inp.disabled) uncompleted++;
        });
        if (uncompleted === 0) {
            checkAnswers();
        }
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
    //  Kiểm Tra Tức Thì 1 Câu
    //  Hỗ trợ: Enter, Blur (chuyển ô), Change, Gõ đúng tự nhảy
    //  Ý TƯỞNG 2: SAI THÌ RUNG ĐỎ VÀ BẮT GÕ LẠI, TUYỆT ĐỐI KHÔNG HIỆN ĐÁP ÁN!
    // ========================================================

    function checkSingleInput(input, options) {
        if (!input || input.disabled) return;
        var opts = options || {};
        var fromBlur = !!opts.fromBlur;

        var answer     = input.getAttribute('data-answer');
        var userAnswer = input.value.trim();
        var rowIndex   = parseInt(input.getAttribute('data-index'), 10);
        var td         = input.parentElement;
        var word       = currentData[rowIndex];

        // Nếu ô đang để trống:
        if (!userAnswer) {
            if (!fromBlur) {
                triggerShake(input);
                input.focus();
            }
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

            // Ghi nhận chuỗi ngày học (Streak 20 từ)
            StreakManager.onWordCorrect();

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

            if (!fromBlur) {
                // Tự động nhảy con trỏ chuột sang ô chưa hoàn thành tiếp theo
                focusNextInput(input);
            } else {
                checkIfAllCompleted();
            }
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

            // Nếu nhấn Enter: giữ nguyên con trỏ tại ô đó và bôi đen để người dùng tự sửa lại
            // Nếu là blur (họ click sang ô khác): không cướp lại focus
            if (!fromBlur) {
                input.focus();
                input.select();
            }
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

                        // Hỗ trợ gõ bộ gõ IME (Unikey / bàn phím tiếng Nhật / Telex)
                        var isComposing = false;
                        input.addEventListener('compositionstart', function () {
                            isComposing = true;
                        });
                        input.addEventListener('compositionend', function () {
                            isComposing = false;
                            if (col === 'nihongo' && romajiConvertCheck && romajiConvertCheck.checked) {
                                var original = input.value;
                                var converted = romajiToHiragana(original);
                                if (converted !== original) {
                                    input.value = converted;
                                }
                            }
                            updateProgress();
                        });

                        // Xử lý khi gõ chữ (BẢO TOÀN CON TRỎ CHUỘT, TUYỆT ĐỐI KHÔNG TỰ NHẢY Ô KHI ĐANG GÕ DỞ)
                        input.addEventListener('input', function (e) {
                            if (col === 'nihongo' && romajiConvertCheck && romajiConvertCheck.checked && !isComposing) {
                                var original = input.value;
                                var selStart = input.selectionStart;
                                var converted = romajiToHiragana(original);
                                if (converted !== original) {
                                    var diff = converted.length - original.length;
                                    input.value = converted;
                                    var newPos = Math.max(0, selStart + diff);
                                    try { input.setSelectionRange(newPos, newPos); } catch (err) {}
                                }
                            }

                            // Khi đang sửa lại từ bị sai, xóa viền đỏ để gõ thoải mái
                            if (input.classList.contains('input-wrong')) {
                                input.classList.remove('input-wrong', 'shake-anim');
                                td.classList.remove('cell-wrong');
                            }

                            updateProgress();
                        });

                        // Nhấn Enter kiểm tra tức thì (CHỈ bắt trên keydown, TUYỆT ĐỐI BỎ keyup để tránh nhảy kép ô)
                        input.addEventListener('keydown', function (e) {
                            if (e.key === 'Enter' || e.keyCode === 13) {
                                if (e.isComposing || isComposing) {
                                    return;
                                }
                                e.preventDefault();
                                if (e.shiftKey) {
                                    // Shift + Enter: bỏ qua sang câu tiếp theo
                                    focusNextInput(input);
                                } else {
                                    // Enter: Kiểm tra tức thì câu này!
                                    checkSingleInput(input, { fromBlur: false });
                                }
                            }
                        });

                        // Khi người dùng click ra ngoài hoặc chuyển sang ô khác (blur)
                        input.addEventListener('blur', function () {
                            if (input.value.trim().length > 0 && !input.disabled) {
                                checkSingleInput(input, { fromBlur: true });
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

            var alreadyDisabled = input.disabled;
            var correctMatch = isMatch(userAnswer, answer, quizMode);

            if (correctMatch) {
                // ĐÚNG MÀU XANH
                input.classList.remove('input-wrong', 'shake-anim');
                input.classList.add('input-correct');
                td.classList.remove('cell-wrong');
                td.classList.add('cell-correct');
                input.disabled = true;

                if (!alreadyDisabled) {
                    StreakManager.onWordCorrect();
                }

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
                getActiveCategoryLabels()[currentCategory] + ' hiện có: <strong>' + updatedStats.learned + '</strong> từ đã thuộc, ' +
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
    //  SPEED TYPING GAME MANAGER (GAME GÕ TỪ PHẢN XẠ SIÊU TỐC)
    // ========================================================
    var startGameBtn        = null;
    var gameSection         = null;
    var gameExitBtn         = null;
    var gameLevelTag        = null;
    var gameCounter         = null;
    var gameProgressBar     = null;
    var gameComboPill       = null;
    var gameComboText       = null;
    var gameScoreNum        = null;
    var gameStage           = null;
    var gameFloatReward     = null;
    var gameAudioBtn        = null;
    var gameMeaningText     = null;
    var gameInputArena      = null;
    var gameSlotsRow        = null;
    var gameTypeInput       = null;
    var gameRevealedInfo    = null;
    var gameRevealedKanji   = null;
    var gameRevealedReading = null;
    var gameRevealedHanviet = null;
    var gameSkipBtn         = null;
    var gameResultSection   = null;
    var gameStatScore       = null;
    var gameStatAccuracy    = null;
    var gameStatMaxCombo    = null;
    var gameStatWpm         = null;
    var gameStreakBanner    = null;
    var gameReplayBtn       = null;
    var gameNewRoundBtn     = null;
    var gameToTableBtn      = null;

    var gameWords           = [];
    var gameIndex           = 0;
    var currentWord         = null;
    var targetSlots         = [];
    var currentSlotIdx      = 0;
    var gameScore           = 0;
    var gameCombo           = 0;
    var gameMaxCombo        = 0;
    var gameTotalKeystrokes = 0;
    var gameCorrectChars    = 0;
    var gameCorrectWords    = 0;
    var gameStartTime       = 0;
    var isWordLocked        = false;
    var wordTransitionTimer = null;

    function playPop() {
        try {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            var ctx = new AudioCtx();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            var now = ctx.currentTime;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(580, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } catch (e) {}
    }

    function cleanGameTarget(nihongo) {
        if (!nihongo) return { displayPrefix: '', targetKana: '' };
        var s = nihongo.split(/[\/,／、,]/)[0].trim();
        s = katakanaToHiragana(s);
        var prefix = '';
        if (s.startsWith('～') || s.startsWith('~')) {
            prefix = '～';
            s = s.replace(/^[～~]/, '').trim();
        }
        s = s.replace(/[\(\)\[\]「」\s]/g, '').trim();
        return { displayPrefix: prefix, targetKana: s };
    }

    function initGameHandlers() {
        startGameBtn        = document.getElementById('start-game-btn');
        gameSection         = document.getElementById('game-section');
        gameExitBtn         = document.getElementById('game-exit-btn');
        gameLevelTag        = document.getElementById('game-level-tag');
        gameCounter         = document.getElementById('game-counter');
        gameProgressBar     = document.getElementById('game-progress-bar');
        gameComboPill       = document.getElementById('game-combo-pill');
        gameComboText       = document.getElementById('game-combo-text');
        gameScoreNum        = document.getElementById('game-score-num');
        gameStage           = document.querySelector('.game-stage');
        gameFloatReward     = document.getElementById('game-float-reward');
        gameAudioBtn        = document.getElementById('game-audio-btn');
        gameMeaningText     = document.getElementById('game-meaning-text');
        gameInputArena      = document.getElementById('game-input-arena');
        gameSlotsRow        = document.getElementById('game-slots-row');
        gameTypeInput       = document.getElementById('game-type-input');
        gameRevealedInfo    = document.getElementById('game-revealed-info');
        gameRevealedKanji   = document.getElementById('game-revealed-kanji');
        gameRevealedReading = document.getElementById('game-revealed-reading');
        gameRevealedHanviet = document.getElementById('game-revealed-hanviet');
        gameSkipBtn         = document.getElementById('game-skip-btn');
        gameResultSection   = document.getElementById('game-result-section');
        gameStatScore       = document.getElementById('game-stat-score');
        gameStatAccuracy    = document.getElementById('game-stat-accuracy');
        gameStatMaxCombo    = document.getElementById('game-stat-max-combo');
        gameStatWpm         = document.getElementById('game-stat-wpm');
        gameStreakBanner    = document.getElementById('game-streak-banner');
        gameReplayBtn       = document.getElementById('game-replay-btn');
        gameNewRoundBtn     = document.getElementById('game-new-round-btn');
        gameToTableBtn      = document.getElementById('game-to-table-btn');

        if (startGameBtn) {
            startGameBtn.addEventListener('click', function () {
                startSpeedGame(false);
            });
        }

        if (gameExitBtn) {
            gameExitBtn.addEventListener('click', function () {
                exitSpeedGame();
            });
        }

        if (gameAudioBtn) {
            gameAudioBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (currentWord) {
                    speakJapanese(currentWord.nihongo);
                }
                if (gameTypeInput) gameTypeInput.focus();
            });
        }

        if (gameSkipBtn) {
            gameSkipBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                skipGameWord();
            });
        }

        if (gameReplayBtn) {
            gameReplayBtn.addEventListener('click', function () {
                startSpeedGame(true);
            });
        }

        if (gameNewRoundBtn) {
            gameNewRoundBtn.addEventListener('click', function () {
                startSpeedGame(false);
            });
        }

        if (gameToTableBtn) {
            gameToTableBtn.addEventListener('click', function () {
                hide(gameResultSection);
                hide(gameSection);
                startQuiz(false);
            });
        }

        if (gameStage) {
            gameStage.addEventListener('click', function () {
                if (gameTypeInput) gameTypeInput.focus();
            });
        }

        if (gameTypeInput) {
            gameTypeInput.addEventListener('input', handleGameInput);
            gameTypeInput.addEventListener('keydown', handleGameKeyDown);
        }

        // Global keyboard shortcut
        window.addEventListener('keydown', function (e) {
            if (!gameSection || gameSection.classList.contains('hidden')) return;

            // Space: replay voice audio
            if (e.code === 'Space' || e.keyCode === 32) {
                if (document.activeElement !== gameTypeInput) {
                    e.preventDefault();
                    if (currentWord) speakJapanese(currentWord.nihongo);
                    if (gameTypeInput) gameTypeInput.focus();
                }
            } else if (e.code === 'Tab' || e.keyCode === 9) {
                e.preventDefault();
                skipGameWord();
            }
        });
    }

    function startSpeedGame(isReplay) {
        currentCategory = categorySelect ? categorySelect.value : '';
        if (!currentCategory) return;

        if (!isReplay) {
            var rawList = (getActiveVocabData()[currentCategory] || []).map(function (item) {
                return {
                    nihongo: item.nihongo,
                    vietnam: item.vietnam,
                    kanji:   item.kanji,
                    hanviet: item.hanviet
                };
            });

            var filterMode = filterModeSelect ? filterModeSelect.value : 'unlearned';
            var progress = loadProgress();
            var filteredList = [];

            if (filterMode === 'unlearned') {
                filteredList = rawList.filter(function (it) {
                    return getWordStatus(progress, currentCategory, it) === 'unlearned';
                });
                if (filteredList.length === 0) {
                    filteredList = rawList.slice();
                }
            } else if (filterMode === 'review') {
                filteredList = rawList.filter(function (it) {
                    return getWordStatus(progress, currentCategory, it) === 'review';
                });
                if (filteredList.length === 0) {
                    filteredList = rawList.slice();
                }
            } else if (filterMode === 'learned') {
                filteredList = rawList.filter(function (it) {
                    return getWordStatus(progress, currentCategory, it) === 'learned';
                });
                if (filteredList.length === 0) {
                    filteredList = rawList.slice();
                }
            } else {
                filteredList = rawList.slice();
            }

            filteredList = shuffleArray(filteredList);

            var limitVal = limitInput ? parseInt(limitInput.value.trim(), 10) : 10;
            if (isNaN(limitVal) || limitVal <= 0) limitVal = 10;
            filteredList = filteredList.slice(0, limitVal);

            gameWords = filteredList;
        }

        if (gameWords.length === 0) {
            alert('Không tìm thấy từ vựng nào để bắt đầu!');
            return;
        }

        // Reset stats
        gameScore = 0;
        gameCombo = 0;
        gameMaxCombo = 0;
        gameTotalKeystrokes = 0;
        gameCorrectChars = 0;
        gameCorrectWords = 0;
        gameStartTime = Date.now();
        isWordLocked = false;
        if (wordTransitionTimer) {
            clearTimeout(wordTransitionTimer);
            wordTransitionTimer = null;
        }

        // Update Level tag
        var catName = (getActiveCategoryLabels()[currentCategory] || 'Từ vựng');
        var flag = currentLevel === 'N3' ? '🌸 N3' : '🎌 N4';
        if (gameLevelTag) gameLevelTag.textContent = flag + ' • ' + catName;

        updateGameHUD();

        hide(controlsSection);
        hide(quizSection);
        hide(resultSection);
        hide(gameResultSection);
        show(gameSection);

        loadGameWord(0);

        window.scrollTo({ top: gameSection.offsetTop - 20, behavior: 'smooth' });
    }

    function updateGameHUD() {
        if (gameScoreNum) gameScoreNum.textContent = String(gameScore);
        if (gameComboText) gameComboText.textContent = 'COMBO x' + gameCombo;
        if (gameComboPill) {
            if (gameCombo >= 2) {
                gameComboPill.classList.add('combo-active');
            } else {
                gameComboPill.classList.remove('combo-active');
            }
        }
    }

    function loadGameWord(idx) {
        if (idx >= gameWords.length) {
            finishSpeedGame();
            return;
        }

        isWordLocked = false;
        gameIndex = idx;
        currentWord = gameWords[idx];
        currentSlotIdx = 0;

        var targetObj = cleanGameTarget(currentWord.nihongo);
        targetSlots = Array.from(targetObj.targetKana);

        // Update Counter & Progress
        if (gameCounter) {
            gameCounter.textContent = 'Từ ' + (idx + 1) + ' / ' + gameWords.length;
        }
        if (gameProgressBar) {
            var pct = Math.round(((idx) / gameWords.length) * 100);
            gameProgressBar.style.width = pct + '%';
        }

        // Meaning
        if (gameMeaningText) {
            gameMeaningText.textContent = currentWord.vietnam || '—';
        }

        // Hide revealed info
        hide(gameRevealedInfo);

        // Render slots
        if (gameSlotsRow) {
            gameSlotsRow.innerHTML = '';

            if (targetObj.displayPrefix) {
                var pSlot = document.createElement('div');
                pSlot.className = 'game-slot slot-filled';
                pSlot.textContent = targetObj.displayPrefix;
                pSlot.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                pSlot.style.background = 'transparent';
                gameSlotsRow.appendChild(pSlot);
            }

            targetSlots.forEach(function (char, i) {
                var slot = document.createElement('div');
                slot.className = 'game-slot ' + (i === 0 ? 'slot-current' : 'slot-empty');
                slot.setAttribute('data-idx', String(i));
                slot.textContent = '_';
                gameSlotsRow.appendChild(slot);
            });
        }

        // Focus & Clear input
        if (gameTypeInput) {
            gameTypeInput.value = '';
            gameTypeInput.focus();
        }

        // Speak word audio
        speakJapanese(currentWord.nihongo);
    }

    function handleGameKeyDown(e) {
        if (isWordLocked) {
            // Any key skips wait and loads next immediately
            if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt') {
                if (wordTransitionTimer) {
                    clearTimeout(wordTransitionTimer);
                    wordTransitionTimer = null;
                }
                loadGameWord(gameIndex + 1);
            }
            return;
        }

        if (e.code === 'Space' || e.keyCode === 32) {
            e.preventDefault();
            if (currentWord) speakJapanese(currentWord.nihongo);
        } else if (e.code === 'Tab' || e.keyCode === 9) {
            e.preventDefault();
            skipGameWord();
        }
    }

    function showFloatReward(text) {
        if (!gameFloatReward) return;
        gameFloatReward.textContent = text || '+1 ❤️';
        gameFloatReward.classList.remove('hidden');
        gameFloatReward.style.animation = 'none';
        void gameFloatReward.offsetWidth;
        gameFloatReward.style.animation = 'floatPop 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    }

    function handleGameInput() {
        if (isWordLocked || !currentWord) return;

        var inputVal = gameTypeInput.value.toLowerCase().replace(/~/g, '～');
        if (!inputVal) return;

        gameTotalKeystrokes++;

        // Convert Romaji / Katakana to Hiragana
        var converted = katakanaToHiragana(romajiToHiragana(inputVal));
        var matched = false;

        // Try matching slots from currentSlotIdx
        while (currentSlotIdx < targetSlots.length) {
            var targetChar = targetSlots[currentSlotIdx];

            // Special matching for chōonpu 'ー': accept '-' or '_' or vowel match
            var isChoonpuMatch = (targetChar === 'ー' && (converted.startsWith('ー') || converted.startsWith('-')));

            if (converted.startsWith(targetChar) || isChoonpuMatch) {
                var slotEl = gameSlotsRow ? gameSlotsRow.querySelector('[data-idx="' + currentSlotIdx + '"]') : null;
                if (slotEl) {
                    slotEl.textContent = targetChar;
                    slotEl.classList.remove('slot-empty', 'slot-current', 'slot-wrong');
                    slotEl.classList.add('slot-filled');
                }

                currentSlotIdx++;
                gameCorrectChars++;
                playPop();

                var advanceLen = isChoonpuMatch && converted.startsWith('-') ? 1 : targetChar.length;
                converted = converted.slice(advanceLen);
                gameTypeInput.value = converted;
                matched = true;

                // Highlight next slot if any
                if (currentSlotIdx < targetSlots.length) {
                    var nextSlot = gameSlotsRow ? gameSlotsRow.querySelector('[data-idx="' + currentSlotIdx + '"]') : null;
                    if (nextSlot) {
                        nextSlot.classList.remove('slot-empty');
                        nextSlot.classList.add('slot-current');
                    }
                }
            } else {
                break;
            }
        }

        // If whole word is completed!
        if (currentSlotIdx >= targetSlots.length) {
            onGameWordComplete();
            return;
        }

        // If not matched, check if input is a completed wrong kana or excessive typo
        if (!matched) {
            var hasWrongCompletedKana = /[\u3041-\u3096ー]/.test(converted);
            if (hasWrongCompletedKana || inputVal.length >= 3) {
                // Typo detected! Shake current slot
                var curSlot = gameSlotsRow ? gameSlotsRow.querySelector('[data-idx="' + currentSlotIdx + '"]') : null;
                if (curSlot) {
                    curSlot.classList.add('slot-wrong');
                    setTimeout(function () {
                        if (curSlot) curSlot.classList.remove('slot-wrong');
                    }, 300);
                }
                playBeep('wrong');
                gameCombo = 0;
                updateGameHUD();
                gameTypeInput.value = '';
            }
        }
    }

    function onGameWordComplete() {
        isWordLocked = true;
        gameCorrectWords++;
        gameCombo++;
        if (gameCombo > gameMaxCombo) gameMaxCombo = gameCombo;
        gameScore += 100 + (gameCombo * 15);
        updateGameHUD();

        // Audio and floating reward
        playBeep('correct');
        showFloatReward(gameCombo >= 2 ? ('🔥 COMBO x' + gameCombo) : '+1 ❤️');

        // Streak credit
        StreakManager.onWordCorrect();

        // Update progress in LocalStorage (mark as learned)
        var progress = loadProgress();
        var k = getWordKey(currentCategory, currentWord);
        var prev = progress[k] || { correct: 0, wrong: 0 };
        progress[k] = {
            status: 'learned',
            correct: (prev.correct || 0) + 1,
            wrong: prev.wrong || 0,
            updatedAt: Date.now()
        };
        saveProgress(progress);
        updateCategoryStatsUI();

        // Reveal word details
        if (gameRevealedKanji) {
            gameRevealedKanji.textContent = (currentWord.kanji && currentWord.kanji !== '—') ? currentWord.kanji : currentWord.nihongo;
        }
        if (gameRevealedReading) {
            gameRevealedReading.textContent = currentWord.nihongo;
        }
        if (gameRevealedHanviet) {
            gameRevealedHanviet.textContent = (currentWord.hanviet && currentWord.hanviet !== '—') ? ('Hán Việt: ' + currentWord.hanviet) : '';
        }
        show(gameRevealedInfo);

        // Transition timer 650ms
        wordTransitionTimer = setTimeout(function () {
            wordTransitionTimer = null;
            loadGameWord(gameIndex + 1);
        }, 650);
    }

    function skipGameWord() {
        if (isWordLocked || !currentWord) return;
        isWordLocked = true;

        gameCombo = 0;
        updateGameHUD();
        playBeep('wrong');

        // Reveal answer in slots
        if (gameSlotsRow) {
            targetSlots.forEach(function (char, i) {
                var s = gameSlotsRow.querySelector('[data-idx="' + i + '"]');
                if (s) {
                    s.textContent = char;
                    s.classList.remove('slot-empty', 'slot-current');
                    s.style.color = '#f87171';
                    s.style.borderColor = '#ef4444';
                }
            });
        }

        // Mark as review in progress
        var progress = loadProgress();
        var k = getWordKey(currentCategory, currentWord);
        var prev = progress[k] || { correct: 0, wrong: 0 };
        progress[k] = {
            status: 'review',
            correct: prev.correct || 0,
            wrong: (prev.wrong || 0) + 1,
            updatedAt: Date.now()
        };
        saveProgress(progress);
        updateCategoryStatsUI();

        // Reveal details
        if (gameRevealedKanji) {
            gameRevealedKanji.textContent = (currentWord.kanji && currentWord.kanji !== '—') ? currentWord.kanji : currentWord.nihongo;
        }
        if (gameRevealedReading) {
            gameRevealedReading.textContent = currentWord.nihongo;
        }
        if (gameRevealedHanviet) {
            gameRevealedHanviet.textContent = (currentWord.hanviet && currentWord.hanviet !== '—') ? ('Hán Việt: ' + currentWord.hanviet) : '';
        }
        show(gameRevealedInfo);

        wordTransitionTimer = setTimeout(function () {
            wordTransitionTimer = null;
            loadGameWord(gameIndex + 1);
        }, 900);
    }

    function finishSpeedGame() {
        hide(gameSection);
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();

        var totalAttempted = gameWords.length;
        var accuracy = totalAttempted > 0 ? Math.round((gameCorrectWords / totalAttempted) * 100) : 100;
        var elapsedMin = (Date.now() - gameStartTime) / 60000;
        var wpm = elapsedMin > 0.05 ? Math.round((gameCorrectChars / 5) / elapsedMin) : Math.round(gameCorrectChars * 2);
        if (wpm < 15) wpm = 28;

        if (gameStatScore) gameStatScore.textContent = String(gameScore);
        if (gameStatAccuracy) gameStatAccuracy.textContent = accuracy + '%';
        if (gameStatMaxCombo) gameStatMaxCombo.textContent = 'x' + gameMaxCombo;
        if (gameStatWpm) gameStatWpm.textContent = wpm + ' WPM';

        if (gameStreakBanner) {
            gameStreakBanner.innerHTML = '🔥 <strong>Chuỗi Ngày Học:</strong> Đã cộng thêm <strong>' + gameCorrectWords + ' từ đúng</strong> vào mục tiêu hôm nay!';
        }

        show(gameResultSection);
        gameResultSection.scrollIntoView({ behavior: 'smooth' });
    }

    function exitSpeedGame() {
        if (wordTransitionTimer) {
            clearTimeout(wordTransitionTimer);
            wordTransitionTimer = null;
        }
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        hide(gameSection);
        hide(gameResultSection);
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
