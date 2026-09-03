(function(){
  "use strict";

  /* ============ TRADUCTIONS ============ */
  var I18N = {
    fr: {
      subtitle: 'Lecture des notes sur la portée, corde par corde',
      tabPlay: 'Jouer',
      tabOptions: 'Réglages',
      lblCorrect: 'Réussies',
      lblStreak: 'Série',
      lblTotal: 'Total',
      listen: 'Écouter',
      feedbackDefault: 'Choisis le nom de la note',
      feedbackCorrect: 'Bravo !',
      feedbackWrong: function(name){ return 'Presque ! La note était ' + name + '.'; },
      noNotesWarning: 'Aucune note n\u2019est sélectionnée. Va dans Réglages pour en activer au moins une.',
      optIntro: 'Choisis les cordes et les doigts à travailler. Les notes de la portée seront tirées uniquement parmi tes réglages. 0 = corde à vide, 1 à 4 = doigts.',
      stringLabel: function(name){ return 'Corde de ' + name; },
      openStringLabel: function(name){ return 'Corde à vide : ' + name; },
      comboCountLabel: 'notes possibles',
      reset: 'Réinitialiser',
      langTitle: 'Langue',
      langSub: 'Change la langue de l\u2019application et le nom des notes.',
      quickSelectTitle: 'Sélection rapide par doigt (toutes cordes)',
      btnFinger: function(f){ return 'Doigt ' + f; },
      footer: '',
      desktopBanner: 'Vivace est pensé pour mobile — ouvre-le sur ton téléphone pour une meilleure expérience.',
      savedToast: 'Réglages enregistrés',
      stringNames: { G:'Sol', D:'Ré', A:'La', E:'Mi' }
    },
    en: {
      subtitle: 'Learn to read notes on the staff, string by string',
      tabPlay: 'Play',
      tabOptions: 'Settings',
      lblCorrect: 'Correct',
      lblStreak: 'Streak',
      lblTotal: 'Total',
      listen: 'Listen',
      feedbackDefault: 'Pick the name of the note',
      feedbackCorrect: 'Well done!',
      feedbackWrong: function(name){ return 'Not quite! The note was ' + name + '.'; },
      noNotesWarning: 'No note is selected. Go to Settings to enable at least one.',
      optIntro: 'Choose the strings and fingers to practise. Staff notes are drawn only from your settings. 0 = open string, 1 to 4 = fingers.',
      stringLabel: function(name){ return name + ' string'; },
      openStringLabel: function(name){ return 'Open string: ' + name; },
      comboCountLabel: 'possible notes',
      reset: 'Reset',
      langTitle: 'Language',
      langSub: 'Change the app language and how notes are named.',
      quickSelectTitle: 'Quick finger selection (all strings)',
      btnFinger: function(f){ return 'Finger ' + f; },
      footer: '',
      desktopBanner: '',
      savedToast: 'Settings saved',
      stringNames: { G:'G', D:'D', A:'A', E:'E' }
    }
  };

  /* ============ THEORIE MUSICALE ============ */
  var NATURAL = ['C','D','E','F','G','A','B'];
  var SOLFEGE = { C:'Do', D:'Ré', E:'Mi', F:'Fa', G:'Sol', A:'La', B:'Si' };
  var SEMITONE = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };

  var STRING_KEYS = ['G','D','A','E']; // du grave à l'aigu
  var STRING_COLOR = { G:'#8A5A34', D:'#C1556B', A:'#5C9C7C', E:'#C6893F' };
  var OPEN_OCTAVE = { G:3, D:4, A:4, E:5 };

  function letterIndex(l){ return NATURAL.indexOf(l); }
  function noteValue(letter, octave){ return octave*7 + letterIndex(letter); }
  function stepNote(letter, octave, steps){
    var idx = letterIndex(letter) + steps;
    var oct = octave + Math.floor(idx/7);
    idx = ((idx % 7) + 7) % 7;
    return { letter: NATURAL[idx], octave: oct };
  }
  function noteForFinger(stringKey, finger){
    return stepNote(stringKey, OPEN_OCTAVE[stringKey], finger);
  }
  function frequencyOf(letter, octave){
    var midi = (octave + 1) * 12 + SEMITONE[letter];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function answerName(letter){
    return lang === 'fr' ? SOLFEGE[letter] : letter;
  }

  /* ============ ETAT / REGLAGES ============ */
  function defaultSettings(){
    var s = { strings:{} };
    STRING_KEYS.forEach(function(key){
      s.strings[key] = { 0:true, 1:true, 2:true, 3:true, 4:true };
    });
    return s;
  }
  function mergeSettings(loaded){
    var base = defaultSettings();
    if(!loaded) return base;
    try{
      STRING_KEYS.forEach(function(key){
        if(loaded.strings && loaded.strings[key]){
          for(var f=0; f<=4; f++){
            if(typeof loaded.strings[key][f] === 'boolean') base.strings[key][f] = loaded.strings[key][f];
          }
        }
      });
    }catch(e){ /* ignore malformed data */ }
    return base;
  }

  var settings = defaultSettings();
  var lang = (navigator.language || 'fr').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';

  var state = {
    currentNote: null,
    lastComboKey: null,
    correct: 0,
    total: 0,
    streak: 0,
    locked: false,
    nextNoteTimer: null
  };

  function buildCombos(){
    var combos = [];
    STRING_KEYS.forEach(function(s){
      for(var f=0; f<=4; f++){
        if(!settings.strings[s][f]) continue;
        combos.push({ string:s, finger:f });
      }
    });
    return combos;
  }

  /* ============ PERSISTANCE (localStorage) ============ */
  var STORAGE_KEY = 'vivace-prefs';

  function savePrefs(){
    try {
      var payload = JSON.stringify({ language: lang, settings: settings });
      localStorage.setItem(STORAGE_KEY, payload);
      showToast(I18N[lang].savedToast);
    } catch(e) {
      /* localStorage indisponible */
    }
  }

  function loadPrefs(){
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      if(!data) return null;
      return JSON.parse(data);
    } catch(e) {
      return null;
    }
  }

  /* ============ APPLIQUER MODIFICATION DES REGLAGES ============ */
  function onSettingsChanged(){
    if (state.nextNoteTimer) {
      clearTimeout(state.nextNoteTimer);
      state.nextNoteTimer = null;
    }
    state.locked = false;
    updateComboCount();
    savePrefs();
    nextNote();
  }

  /* ============ RENDU PORTEE ============ */
  var svg = document.getElementById('staffSvg');
  var STAFF_TOP = 70, STAFF_BOTTOM = 150, UNIT = 10;
  var NOTE_X = 190;
  var REF = noteValue('E',4);

  function svgEl(tag, attrs){
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for(var k in attrs){ el.setAttribute(k, attrs[k]); }
    return el;
  }
  function drawStaticStaff(){
    svg.innerHTML = '';
    for(var i=0;i<5;i++){
      var y = STAFF_TOP + i*20;
      svg.appendChild(svgEl('line', { class:'staff-line', x1:24, x2:276, y1:y, y2:y }));
    }
    var clef = svgEl('text', { class:'clef-glyph', x:36, y:150, 'font-size':95 });
    clef.textContent = '\uD834\uDD1E';
    svg.appendChild(clef);
  }
  function ledgerPositions(halfSteps){
    var lines = [];
    if(halfSteps <= -2){
      var h = -2;
      while(h >= halfSteps){ lines.push(h); h -= 2; }
    }
    if(halfSteps >= 8){
      var h2 = 8;
      while(h2 <= halfSteps){ lines.push(h2); h2 += 2; }
    }
    return lines;
  }
  var noteGroup = null;
  function renderNote(note, flashClass){
    if(noteGroup) noteGroup.remove();
    noteGroup = svgEl('g', { class:'note-anim' });
    var halfSteps = noteValue(note.letter, note.octave) - REF;
    var y = STAFF_BOTTOM - halfSteps*UNIT;

    ledgerPositions(halfSteps).forEach(function(h){
      var ly = STAFF_BOTTOM - h*UNIT;
      noteGroup.appendChild(svgEl('line', { class:'ledger-line', x1: NOTE_X-16, x2: NOTE_X+16, y1: ly, y2: ly }));
    });

    var stemUp = halfSteps <= 4;
    if(stemUp){
      noteGroup.appendChild(svgEl('line', { class:'stem', x1: NOTE_X+10, x2: NOTE_X+10, y1: y-1, y2: y-42 }));
    } else {
      noteGroup.appendChild(svgEl('line', { class:'stem', x1: NOTE_X-10, x2: NOTE_X-10, y1: y+1, y2: y+42 }));
    }

    var head = svgEl('ellipse', {
      class: 'notehead' + (flashClass ? ' ' + flashClass : ''),
      cx: NOTE_X, cy: y, rx: 11, ry: 8,
      transform: 'rotate(-18 ' + NOTE_X + ' ' + y + ')'
    });
    noteGroup.appendChild(head);
    svg.appendChild(noteGroup);
    return head;
  }

  /* ============ AUDIO ============ */
  var audioCtx = null;
  function playCurrentNote(){
    if(!state.currentNote) return;
    try{
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var freq = frequencyOf(state.currentNote.letter, state.currentNote.octave);
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      var now = audioCtx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 1.15);
    }catch(e){ /* audio indisponible */ }
  }

  /* ============ BOUTONS DE REPONSE ============ */
  var answersEl = document.getElementById('answers');
  var buttonsByLetter = {};
  NATURAL.forEach(function(letter){
    var btn = document.createElement('button');
    btn.className = 'note-btn';
    btn.type = 'button';
    btn.addEventListener('click', function(){ handleAnswer(letter, btn); });
    answersEl.appendChild(btn);
    buttonsByLetter[letter] = btn;
  });
  function refreshAnswerLabels(){
    NATURAL.forEach(function(letter){
      buttonsByLetter[letter].textContent = answerName(letter);
    });
  }

  var feedbackEl = document.getElementById('feedback');
  var scoreCorrectEl = document.getElementById('scoreCorrect');
  var scoreStreakEl = document.getElementById('scoreStreak');
  var scoreTotalEl = document.getElementById('scoreTotal');
  var warningEl = document.getElementById('noNotesWarning');

  function setButtonsDisabled(disabled){
    NATURAL.forEach(function(letter){ buttonsByLetter[letter].disabled = disabled; });
  }
  function clearButtonStates(){
    NATURAL.forEach(function(letter){ buttonsByLetter[letter].classList.remove('is-correct','is-wrong'); });
  }

  function nextNote(){
    var combos = buildCombos();
    clearButtonStates();
    feedbackEl.className = 'feedback';

    if(combos.length === 0){
      warningEl.style.display = 'block';
      answersEl.style.display = 'none';
      document.querySelector('.staff-card').style.display = 'none';
      document.querySelector('.listen-row').style.display = 'none';
      feedbackEl.textContent = '';
      state.currentNote = null;
      return;
    }
    warningEl.style.display = 'none';
    answersEl.style.display = 'grid';
    document.querySelector('.staff-card').style.display = 'block';
    document.querySelector('.listen-row').style.display = 'flex';

    var pick, key, tries = 0;
    do{
      pick = combos[Math.floor(Math.random()*combos.length)];
      key = pick.string + pick.finger;
      tries++;
    } while(tries < 8 && combos.length > 1 && key === state.lastComboKey);
    state.lastComboKey = key;

    var note = noteForFinger(pick.string, pick.finger);
    state.currentNote = note;
    renderNote(note);
    setButtonsDisabled(false);
    feedbackEl.textContent = I18N[lang].feedbackDefault;
  }

  function handleAnswer(letter, btn){
    if(state.locked || !state.currentNote) return;
    state.locked = true;
    setButtonsDisabled(true);

    var isCorrect = (letter === state.currentNote.letter);
    state.total++;

    if(isCorrect){
      state.correct++;
      state.streak++;
      btn.classList.add('is-correct');
      renderNote(state.currentNote, 'correct-flash');
      feedbackEl.textContent = I18N[lang].feedbackCorrect;
      feedbackEl.className = 'feedback is-correct';
    } else {
      state.streak = 0;
      btn.classList.add('is-wrong');
      buttonsByLetter[state.currentNote.letter].classList.add('is-correct');
      renderNote(state.currentNote, 'wrong-flash');
      feedbackEl.textContent = I18N[lang].feedbackWrong(answerName(state.currentNote.letter));
      feedbackEl.className = 'feedback is-wrong';
    }

    scoreCorrectEl.textContent = state.correct;
    scoreStreakEl.textContent = state.streak;
    scoreTotalEl.textContent = state.total;

    state.nextNoteTimer = setTimeout(function(){
      state.nextNoteTimer = null;
      state.locked = false;
      nextNote();
    }, isCorrect ? 800 : 1500);
  }

  document.getElementById('listenBtn').addEventListener('click', playCurrentNote);

  /* ============ ONGLETS ============ */
  var tabPlayBtn = document.getElementById('tabPlayBtn');
  var tabOptionsBtn = document.getElementById('tabOptionsBtn');
  var panelPlay = document.getElementById('panelPlay');
  var panelOptions = document.getElementById('panelOptions');

  function selectTab(which){
    var playing = which === 'play';
    tabPlayBtn.setAttribute('aria-selected', playing ? 'true' : 'false');
    tabOptionsBtn.setAttribute('aria-selected', playing ? 'false' : 'true');
    panelPlay.classList.toggle('active', playing);
    panelOptions.classList.toggle('active', !playing);
  }
  tabPlayBtn.addEventListener('click', function(){ selectTab('play'); });
  tabOptionsBtn.addEventListener('click', function(){ selectTab('options'); });

  /* ============ PANNEAU REGLAGES ============ */
  var stringCardsEl = document.getElementById('stringCards');
  var comboCountEl = document.getElementById('comboCount');
  var langChipsEl = document.getElementById('langChips');

  function updateComboCount(){
    comboCountEl.textContent = buildCombos().length;
  }

  /* Rendu des 4 boutons de sélection rapide pour Doigt 1, 2, 3 et 4 */
  function buildQuickSelectCard(){
    var existingCard = document.getElementById('quickSelectCard');
    if(existingCard) existingCard.remove();

    var t = I18N[lang];
    var card = document.createElement('div');
    card.id = 'quickSelectCard';
    card.className = 'opt-card';

    var h3 = document.createElement('h3');
    h3.textContent = t.quickSelectTitle;
    card.appendChild(h3);

    var row = document.createElement('div');
    row.className = 'chip-row';

    [1, 2, 3, 4].forEach(function(finger){
      // Vérifier si le doigt est entièrement coché sur toutes les cordes
      var allActive = STRING_KEYS.every(function(k){ return settings.strings[k][finger]; });

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip wide';
      btn.textContent = t.btnFinger(finger);
      btn.setAttribute('aria-pressed', allActive ? 'true' : 'false');

      btn.addEventListener('click', function(){
        var newState = !allActive;
        STRING_KEYS.forEach(function(k){
          settings.strings[k][finger] = newState;
        });
        buildQuickSelectCard();
        buildStringCards();
        onSettingsChanged();
      });
      row.appendChild(btn);
    });

    card.appendChild(row);
    stringCardsEl.parentNode.insertBefore(card, stringCardsEl);
  }

  function buildStringCards(){
    stringCardsEl.innerHTML = '';
    var t = I18N[lang];
    STRING_KEYS.forEach(function(key){
      var displayName = t.stringNames[key];
      var card = document.createElement('div');
      card.className = 'opt-card';

      var h3 = document.createElement('h3');
      var dot = document.createElement('span');
      dot.className = 'string-dot';
      dot.style.background = STRING_COLOR[key];
      h3.appendChild(dot);
      h3.appendChild(document.createTextNode(t.stringLabel(displayName)));
      card.appendChild(h3);

      var sub = document.createElement('p');
      sub.className = 'opt-sub';
      sub.textContent = t.openStringLabel(answerName(key));
      card.appendChild(sub);

      var row = document.createElement('div');
      row.className = 'chip-row';
      for(var f=0; f<=4; f++){
        (function(finger){
          var chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'chip';
          chip.textContent = finger;
          chip.setAttribute('aria-pressed', settings.strings[key][finger] ? 'true' : 'false');
          chip.addEventListener('click', function(){
            settings.strings[key][finger] = !settings.strings[key][finger];
            chip.setAttribute('aria-pressed', settings.strings[key][finger] ? 'true' : 'false');
            buildQuickSelectCard();
            onSettingsChanged();
          });
          row.appendChild(chip);
        })(f);
      }
      card.appendChild(row);
      stringCardsEl.appendChild(card);
    });
  }

  function buildLanguageChips(){
    langChipsEl.innerHTML = '';
    [ {code:'fr', label:'Français'}, {code:'en', label:'English'} ].forEach(function(opt){
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip wide';
      chip.textContent = opt.label;
      chip.setAttribute('aria-pressed', lang === opt.code ? 'true' : 'false');
      chip.addEventListener('click', function(){
        if(lang === opt.code) return;
        setLanguage(opt.code);
        savePrefs();
      });
      langChipsEl.appendChild(chip);
    });
  }

  document.getElementById('resetBtn').addEventListener('click', function(){
    settings = defaultSettings();
    buildQuickSelectCard();
    buildStringCards();
    onSettingsChanged();
  });

  /* ============ TEXTES STATIQUES / LANGUE ============ */
  function applyStaticTexts(){
    var t = I18N[lang];
    document.getElementById('htmlRoot').setAttribute('lang', lang);
    document.getElementById('headerSubtitle').textContent = t.subtitle;
    tabPlayBtn.textContent = t.tabPlay;
    tabOptionsBtn.textContent = t.tabOptions;
    document.getElementById('lblCorrect').textContent = t.lblCorrect;
    document.getElementById('lblStreak').textContent = t.lblStreak;
    document.getElementById('lblTotal').textContent = t.lblTotal;
    document.getElementById('listenBtnText').textContent = t.listen;
    document.getElementById('noNotesWarning').textContent = t.noNotesWarning;
    document.getElementById('optIntro').textContent = t.optIntro;
    document.getElementById('comboCountLabel').textContent = t.comboCountLabel;
    document.getElementById('resetBtn').textContent = t.reset;
    document.getElementById('langTitle').textContent = t.langTitle;
    document.getElementById('langSub').textContent = t.langSub;
    document.getElementById('footerText').textContent = t.footer;
    document.getElementById('desktopBannerText').textContent = t.desktopBanner;
    if(state.currentNote === null && buildCombos().length === 0){
      feedbackEl.textContent = '';
    } else {
      feedbackEl.textContent = t.feedbackDefault;
      feedbackEl.className = 'feedback';
    }
  }

  function setLanguage(newLang){
    lang = newLang;
    refreshAnswerLabels();
    buildQuickSelectCard();
    buildStringCards();
    buildLanguageChips();
    applyStaticTexts();
  }

  /* ============ TOAST ============ */
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('visible');
    if(toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('visible'); }, 1600);
  }

  /* ============ BANDEAU DESKTOP ============ */
  function checkDesktop(){
    var isDesktop = false;
    try{
      isDesktop = window.matchMedia('(pointer: fine)').matches && window.innerWidth > 760;
    }catch(e){ isDesktop = window.innerWidth > 760; }
    if(isDesktop){
      document.getElementById('desktopBanner').style.display = 'flex';
    }
  }
  document.getElementById('desktopBannerClose').addEventListener('click', function(){
    document.getElementById('desktopBanner').style.display = 'none';
  });

  /* ============ ONBOARDING (choix de langue) ============ */
  var onboardOverlay = document.getElementById('onboardOverlay');
  function openOnboarding(){ onboardOverlay.style.display = 'flex'; }
  function closeOnboarding(){ onboardOverlay.style.display = 'none'; }
  document.getElementById('chooseFr').addEventListener('click', function(){
    setLanguage('fr');
    closeOnboarding();
    savePrefs();
  });
  document.getElementById('chooseEn').addEventListener('click', function(){
    setLanguage('en');
    closeOnboarding();
    savePrefs();
  });

  /* ============ INIT ============ */
  function init(){
    drawStaticStaff();
    
    var stored = loadPrefs();
    if(stored){
      settings = mergeSettings(stored.settings);
      if(stored.language === 'fr' || stored.language === 'en'){
        lang = stored.language;
      }
    }

    refreshAnswerLabels();
    buildQuickSelectCard();
    buildStringCards();
    buildLanguageChips();
    applyStaticTexts();
    updateComboCount();
    nextNote();
    checkDesktop();

    if(!stored){
      openOnboarding();
    }
  }

  init();

})();
