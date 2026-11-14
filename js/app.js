/* ========================================================
   HỌC TỪ VỰNG TIẾNG NHẬT N4 — MINNA NO NIHONGO
   Main Application Logic
   ======================================================== */

(function () {
    'use strict';

    // ---- DOM Elements ----
    var controlsSection     = null;
    var categorySelect      = null;
    var limitInput          = null;
    var chipBtns            = null;
    var startBtn            = null;
    var romajiConvertCheck  = null;
    var quizModeInputs      = null;

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

    // ---- State ----
    var currentData = [];
    var wrongData   = [];
    var quizMode    = 'nihongo';
    var isChecked   = false;

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
        startBtn           = document.getElementById('start-btn');
        romajiConvertCheck = document.getElementById('romaji-convert-check');
        quizModeInputs     = document.querySelectorAll('input[name="quiz-mode"]');

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

        // Set default limit input to 20
        if (limitInput) {
            limitInput.value = '20';
        }

        populateCategories();
        bindEvents();
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
        startBtn.addEventListener('click', function () {
            startQuiz(false);
        });

        checkBtn.addEventListener('click', checkAnswers);
        resetBtn.addEventListener('click', resetQuiz);
        showAnswersBtn.addEventListener('click', revealAllAnswers);
        backBtn.addEventListener('click', goBack);

        retryWrongBtn.addEventListener('click', function () {
            if (wrongData.length > 0) {
                currentData = shuffleArray(wrongData.slice());
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

        // Sync chips when user types manually into input
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

        // Mode cards visual toggle
        var modeCards = document.querySelectorAll('.mode-card');
        modeCards.forEach(function (card) {
            card.addEventListener('click', function () {
                modeCards.forEach(function (c) { c.classList.remove('active'); });
                card.classList.add('active');
                var radio = card.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            });
        });
    }

    // ========================================================
    //  Shuffle (Fisher-Yates) — TỰ ĐỘNG XÁO TRỘN THEO YÊU CẦU
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
    //  Romaji to Hiragana Converter
    // ========================================================

    function romajiToHiragana(str) {
        if (!str) return '';
        var s = str.toLowerCase().trim();
        s = s.replace(/~/g, '～').replace(/-/g, 'ー');

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
        // Lone n before consonants or end of word
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
    //  Start Quiz
    // ========================================================

    function startQuiz(isRetry) {
        var category = categorySelect.value;
        var selectedMode = document.querySelector('input[name="quiz-mode"]:checked');
        quizMode = selectedMode ? selectedMode.value : 'nihongo';

        if (!isRetry) {
            var rawList = (vocabData[category] || []).map(function (item) {
                return {
                    nihongo: item.nihongo,
                    vietnam: item.vietnam,
                    kanji:   item.kanji,
                    hanviet: item.hanviet
                };
            });

            // TỰ ĐỘNG XÁO TRỘN THỨ TỰ TỪ (AUTO SHUFFLE)
            rawList = shuffleArray(rawList);

            // Áp dụng số lượng từ người dùng điền vào ô
            if (limitInput) {
                var limitVal = limitInput.value.trim();
                if (limitVal !== '') {
                    var parsedLimit = parseInt(limitVal, 10);
                    if (!isNaN(parsedLimit) && parsedLimit > 0) {
                        rawList = rawList.slice(0, parsedLimit);
                    }
                }
            }

            currentData = rawList;
        }

        wrongData = [];
        isChecked = false;
        hide(retryWrongBtn);

        // Update headers
        quizTitle.textContent = categoryLabels[category] || 'Từ vựng';
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
    //  Update Progress Bar
    // ========================================================

    function updateProgress() {
        var allInputs = document.querySelectorAll('.quiz-input');
        var total = allInputs.length;
        if (total === 0) {
            progressBar.style.width = '0%';
            quizCounter.textContent = '0 / ' + currentData.length + ' từ';
            return;
        }

        var filled = 0;
        allInputs.forEach(function (inp) {
            if (inp.value.trim().length > 0) filled++;
        });

        var pct = Math.round((filled / total) * 100);
        progressBar.style.width = pct + '%';
        quizCounter.textContent = filled + ' / ' + total + ' từ';
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

                    // If word has no answer for this field (e.g. "—")
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

                        // Romaji real-time conversion if learning Tiếng Nhật
                        if (col === 'nihongo') {
                            input.addEventListener('input', function (e) {
                                if (romajiConvertCheck && romajiConvertCheck.checked) {
                                    var original = e.target.value;
                                    var converted = romajiToHiragana(original);
                                    if (converted !== original) {
                                        e.target.value = converted;
                                    }
                                }
                                updateProgress();
                            });
                        } else {
                            input.addEventListener('input', updateProgress);
                        }

                        // Enter navigation
                        input.addEventListener('keydown', handleKeyNavigation);
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

        // Auto focus first input
        requestAnimationFrame(function () {
            var firstInput = document.querySelector('.quiz-input');
            if (firstInput) firstInput.focus();
        });

        updateProgress();
    }

    // Keyboard navigation (Enter)
    function handleKeyNavigation(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            var allInputs = Array.prototype.slice.call(
                document.querySelectorAll('.quiz-input:not(:disabled)')
            );
            var currentIndex = allInputs.indexOf(e.target);

            if (currentIndex >= 0 && currentIndex < allInputs.length - 1) {
                allInputs[currentIndex + 1].focus();
                allInputs[currentIndex + 1].select();
            } else {
                checkAnswers();
            }
        }
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
            .replace(/[\s\u3000]+/g, '')   // remove all whitespace
            .replace(/[~～]/g, '')         // normalize tilde
            .replace(/[.,:;?!/\\()\[\]'"`]/g, '');
    }

    function getAnswerCandidates(rawAnswer) {
        if (!rawAnswer) return [];
        var list = [rawAnswer];

        // Split by / or , or ;
        var parts = rawAnswer.split(/[/,;、，]/);
        parts.forEach(function (part) {
            var trimmed = part.trim();
            if (trimmed) {
                list.push(trimmed);

                // Without parentheses: "đến trễ (muộn)" -> "đến trễ"
                var withoutParen = trimmed.replace(/\([^)]*\)/g, '').trim();
                if (withoutParen && withoutParen !== trimmed) {
                    list.push(withoutParen);
                }

                // Inside parentheses: "đến trễ (muộn)" -> "muộn"
                var match = trimmed.match(/\(([^)]+)\)/);
                if (match && match[1]) {
                    list.push(match[1].trim());
                }
            }
        });

        return list;
    }

    function isMatch(userAnswer, rawAnswer) {
        if (!userAnswer || !rawAnswer) return false;
        var normUser = normalizeText(userAnswer);
        if (!normUser) return false;

        // If user typed romaji for Japanese, test converted hiragana
        var normRomajiUser = normalizeText(romajiToHiragana(userAnswer));

        var candidates = getAnswerCandidates(rawAnswer);
        for (var i = 0; i < candidates.length; i++) {
            var normCand = normalizeText(candidates[i]);
            if (normUser === normCand) return true;
            if (normRomajiUser && normRomajiUser === normCand) return true;
        }

        return false;
    }

    // ========================================================
    //  Check Answers
    // ========================================================

    function checkAnswers() {
        if (isChecked) return;
        isChecked = true;

        var inputs = document.querySelectorAll('.quiz-input');
        var correct = 0;
        var wrong   = 0;
        wrongData   = [];

        inputs.forEach(function (input) {
            var answer     = input.getAttribute('data-answer');
            var userAnswer = input.value;
            var rowIndex   = parseInt(input.getAttribute('data-index'), 10);
            var td         = input.parentElement;

            var correctMatch = isMatch(userAnswer, answer);

            if (correctMatch) {
                // ĐÚNG MÀU XANH
                input.classList.remove('input-wrong');
                input.classList.add('input-correct');
                td.classList.add('cell-correct');
                correct++;
            } else {
                // SAI MÀU ĐỎ
                input.classList.remove('input-correct');
                input.classList.add('input-wrong');
                td.classList.add('cell-wrong');
                wrong++;

                // Track wrong items for retry
                if (!isNaN(rowIndex) && currentData[rowIndex]) {
                    wrongData.push(currentData[rowIndex]);
                }

                // Show correct answer badge
                var hint = document.createElement('div');
                hint.className = 'answer-hint';
                hint.textContent = '→ ' + answer;
                td.appendChild(hint);
            }

            input.disabled = true;
        });

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
            resultSubtext.textContent = 'Bạn đã thuộc trọn vẹn bộ từ này!';
        } else if (pct >= 80) {
            resultTrophy.textContent = '🌟';
            resultMessage.textContent = 'Làm rất tốt! Bạn đã nắm chắc kiến thức!';
            resultSubtext.textContent = 'Chỉ còn vài từ cần ôn lại một chút thôi.';
        } else if (pct >= 50) {
            resultTrophy.textContent = '👍';
            resultMessage.textContent = 'Khá tốt! Hãy tiếp tục luyện tập nhé!';
            resultSubtext.textContent = 'Bấm "Ôn lại các câu sai" để ghi nhớ sâu hơn.';
        } else {
            resultTrophy.textContent = '💪';
            resultMessage.textContent = 'Đừng nản lòng! Vạn sự khởi đầu nan!';
            resultSubtext.textContent = 'Hãy xem lại đáp án và làm lại để thuộc lòng nhé.';
        }

        // Show retry button if any wrong
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

        // Auto shuffle again on reset
        currentData = shuffleArray(currentData);

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
