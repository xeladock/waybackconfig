let diffEditor;
let currentTheme = 'vs-dark';



require.config({ paths: { vs: './nm/monaco/min/vs' } });

require(['vs/editor/editor.main'], function () {
  diffEditor = monaco.editor.createDiffEditor(document.getElementById('editor-container'), {
    theme: currentTheme,
    automaticLayout: true,
    readOnly: true,
    renderIndicators: false,
    renderSideBySide: true,
    splitViewDefaultRatio: 0.5,
    originalEditable: false,
    renderOverviewRuler: false,
    overviewRulerLanes: 0,
    glyphMargin: false,
    lineNumbers: 'off',
    renderLineHighlight: 'none',
    scrollBeyondLastLine: false,
    hideUnchangedRegions: false,
    renderMarginRevertIcon: false,
    enableSplitViewResizing: true,
    scrollbar: {
      vertical: 'visible',
      verticalScrollbarSize: 10,
      useShadows: false
    }


  });
  diffEditor.setModel({
    original: monaco.editor.createModel('', 'text/plain'),
    modified: monaco.editor.createModel('', 'text/plain')
  });

  const placeholderText = "Выберите устройство и файл из списка выше для загрузки конфигурации";

  const editors = [diffEditor.getOriginalEditor(), diffEditor.getModifiedEditor()];
  editors.forEach(editor => {
    const container = editor.getDomNode();
    if (container) {
      const placeholderDiv = document.createElement('div');
      placeholderDiv.className = 'empty-editor-placeholder';
      placeholderDiv.innerText = placeholderText;
      container.appendChild(placeholderDiv);

      editor.onDidChangeModelContent(() => {
        if (editor.getValue().trim() === '') {
          placeholderDiv.style.display = 'block';
        } else {
          placeholderDiv.style.display = 'none';
        }
      });
    }
  });
});


async function loadConfigFromBackend(side) {
  const url = getConfigUrl(side);
  if (!url) return;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Ошибка ${response.status}: Конфигурация не найдена`);
    }
    const configText = await response.text();
    updateEditorModel(side, configText);
  } catch (error) {
    console.error(`Ошибка загрузки [${side}]:`, error);
    updateEditorModel(side, `! Ошибка загрузки файла конфигурации\n! ${error.message}`);
    fileSelect.innerHTML = '<option value="" disabled selected>Конфигурация</option>';
  }
}



function updateEditorModel(side, text) {
  const model = diffEditor.getModel();
  const cleanText = text ? text.trimEnd() : '';

  if (side === 'left') {
    model.original.setValue(cleanText);
  } else {
    model.modified.setValue(cleanText);
  }

  const leftHasText = model.original.getValue().trim().length > 0;
  const rightHasText = model.modified.getValue().trim().length > 0;

  const container = document.getElementById('editor-container');

  // Включаем подсветку и убираем маскирующий класс ТОЛЬКО если оба конфига загружены
  if (leftHasText && rightHasText) {
    if (container) {
      container.classList.remove('empty-diff');
      container.classList.remove('hide-cursor');
    }

    diffEditor.updateOptions({
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      renderIndicators: true
    });
  } else {
    // Если один из файлов еще грузится — сохраняем чистый вид
    if (container) {
      container.classList.add('empty-diff');
    }
    diffEditor.updateOptions({
      lineNumbers: 'off',
      renderIndicators: false
    });
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const icon = document.getElementById('themeIcon');

  if (icon) {
    icon.style.transform = 'rotate(360deg)';
    setTimeout(() => {
      icon.style.transform = 'rotate(0deg)';
    }, 300);
  }

  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    if (icon) icon.textContent = "🌙 Ночь";
    currentTheme = 'vs';
    localStorage.setItem('theme', 'light'); // Сохраняем выбор
  } else {
    html.classList.add('dark');
    if (icon) icon.textContent = "☀️ День";
    currentTheme = 'vs-dark';
    localStorage.setItem('theme', 'dark');  // Сохраняем выбор
  }

  if (typeof monaco !== 'undefined' && diffEditor) {
    monaco.editor.setTheme(currentTheme);
  }
}

let isHighlightLeft = true;
let isHighlightRight = true;

function toggleHighlight(side) {
  const container = document.getElementById('editor-container');

  if (side === 'left') {
    isHighlightLeft = !isHighlightLeft;
    container.classList.toggle('no-diff-left', !isHighlightLeft);
    const iconEl = document.getElementById('highlightIconLeft');
    if (iconEl) iconEl.textContent = `${isHighlightLeft ? '💡' : '🔌'} Подсветка ЛП`;
  } else if (side === 'right') {
    isHighlightRight = !isHighlightRight;
    container.classList.toggle('no-diff-right', !isHighlightRight);
    const iconEl = document.getElementById('highlightIconRight');
    if (iconEl) iconEl.textContent = `${isHighlightRight ? '💡' : '🔌'} Подсветка ПП`;
  }
}

function switchPanels() {
  const fields = ['date', 'type', 'region', 'device', 'file'];

  // 1. Меняем местами HTML-содержимое (варианты <option>) и значения всех селектов/полей
  fields.forEach(field => {
    const leftEl = document.getElementById(field + 'Left');
    const rightEl = document.getElementById(field + 'Right');

    if (leftEl && rightEl) {
      // Сохраняем варианты выбора (<option>) и значения левой панели
      const tempHTML = leftEl.innerHTML;
      const tempValue = leftEl.value;

      // Переносим данные из правой панели в левую
      leftEl.innerHTML = rightEl.innerHTML;
      leftEl.value = rightEl.value;

      // Переносим сохраненные данные из левой панели в правую
      rightEl.innerHTML = tempHTML;
      rightEl.value = tempValue;
    }
  });

  // 2. Меняем местами состояние подсветок (флаги и CSS-классы)
  const tempHighlight = isHighlightLeft;
  isHighlightLeft = isHighlightRight;
  isHighlightRight = tempHighlight;

  const container = document.getElementById('editor-container');
  container.classList.toggle('no-diff-left', !isHighlightLeft);
  container.classList.toggle('no-diff-right', !isHighlightRight);

  // Обновляем текст на кнопках подсветок
  const iconLeft = document.getElementById('highlightIconLeft');
  const iconRight = document.getElementById('highlightIconRight');
  if (iconLeft) iconLeft.textContent = `${isHighlightLeft ? '🔌' : '💡'} Подсветка L`;
  if (iconRight) iconRight.textContent = `${isHighlightRight ? '🔌' : '💡'} Подсветка R`;

  // 3. Меняем местами содержимое Monaco Editor
  if (diffEditor) {
    const model = diffEditor.getModel();
    if (model) {
      const leftValue = model.original.getValue();
      const rightValue = model.modified.getValue();

      model.original.setValue(rightValue);
      model.modified.setValue(leftValue);
    }
  }
}

function updateSyncIcon() {
  const isSync = document.getElementById('syncPanels').checked;
  const iconEl = document.getElementById('syncIcon');
  iconEl.textContent = isSync ? '🔗' : '⛓️‍💥';

}



window.addEventListener('resize', () => {
  diffEditor.layout();
});

function getConfigUrl(side) {
  const isLeft = side === 'left';
  const dateVal = document.getElementById(isLeft ? 'dateLeft' : 'dateRight').value;
  const typeVal = document.getElementById(isLeft ? 'typeLeft' : 'typeRight').value;
  const regionVal = document.getElementById(isLeft ? 'regionLeft' : 'regionRight').value;
  const deviceVal = document.getElementById(isLeft ? 'deviceLeft' : 'deviceRight').value;
  const fileVal = document.getElementById(isLeft ? 'fileLeft' : 'fileRight').value;

  if (!dateVal || !deviceVal || !fileVal) return null;

  const [year, monthStr, dayStr] = dateVal.split('-');
<!--  const monthName = MONTH_NAMES[parseInt(monthStr, 10) - 1];-->

  const filePath = `/archive/${year}/${monthStr}/${dayStr}/${typeVal}/${regionVal}/${deviceVal}/${fileVal}`;
  return `/api/config?path=${encodeURIComponent(filePath)}`;
}

async function loadConfigFromBackend(side) {
  const url = getConfigUrl(side);
  if (!url) return;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Ошибка ${response.status}: Конфигурация не найдена`);
    }
    const configText = await response.text();
    updateEditorModel(side, configText);
  } catch (error) {
    console.error(`Ошибка загрузки [${side}]:`, error);
    updateEditorModel(side, `! Ошибка загрузки файла конфигурации\n! ${error.message}`);
  }
}

// Запрос доступных файлов конфигурации для выбранного устройства


// Вызывается при изменении любого параметра устройства (дата, тип, регион, устройство)
// Получение сегодняшней даты в формате YYYY-MM-DD
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function onDeviceChange(sourceSide) {
  const isSync = document.getElementById('syncPanels').checked;
  const targetSide = sourceSide === 'left' ? 'right' : 'left';

  const sourceDateEl = document.getElementById(sourceSide === 'left' ? 'dateLeft' : 'dateRight');
  const targetDateEl = document.getElementById(targetSide === 'left' ? 'dateLeft' : 'dateRight');

  // 1. Ставим сегодняшнее число, если дата не выбрана
  if (!sourceDateEl.value) {
    sourceDateEl.value = getTodayDateString();
  }

  // Считываем текущий выбранный файл ДО сброса
  const sourceFileSelect = document.getElementById(sourceSide === 'left' ? 'fileLeft' : 'fileRight');
  const savedFile = sourceFileSelect ? sourceFileSelect.value : null;

  if (isSync) {
    if (!targetDateEl.value) {
      targetDateEl.value = getTodayDateString();
    }

    const targetFileSelect = document.getElementById(targetSide === 'left' ? 'fileLeft' : 'fileRight');
    const savedFileTarget = targetFileSelect ? targetFileSelect.value : null;

    // Синхронизируем настройки устройства (Тип, Регион, Устройство)
    const fields = ['type', 'region', 'device'];
    fields.forEach(field => {
      const sourceVal = document.getElementById(field + (sourceSide === 'left' ? 'Left' : 'Right')).value;
      document.getElementById(field + (targetSide === 'left' ? 'Left' : 'Right')).value = sourceVal;
    });

    await updateDynamicDropdowns('left');
    await updateDynamicDropdowns('right');

    // Обновляем списки файлов с сохранением ранее выбранных файлов
    await fetchFileList('left', savedFile);
    await fetchFileList('right', savedFileTarget);

    await Promise.all([
      loadConfigFromBackend('left'),
      loadConfigFromBackend('right')
    ]);
  } else {
    await fetchFileList(sourceSide, savedFile);
    loadConfigFromBackend(sourceSide);
  }
}

async function fetchFileList(side, preferredFile = null) {
  const isLeft = side === 'left';
  const dateVal = document.getElementById(isLeft ? 'dateLeft' : 'dateRight').value;
  const typeVal = document.getElementById(isLeft ? 'typeLeft' : 'typeRight').value;
  const regionVal = document.getElementById(isLeft ? 'regionLeft' : 'regionRight').value;
  const deviceVal = document.getElementById(isLeft ? 'deviceLeft' : 'deviceRight').value;
  const fileSelect = document.getElementById(isLeft ? 'fileLeft' : 'fileRight');

  // Если хотя бы одно обязательное поле не выбрано — сбрасываем список
  if (!dateVal || !regionVal || !deviceVal) {
    fileSelect.innerHTML = '<option value="" disabled selected>Конфигурация</option>';
    return;
  }

  const [year, monthStr, dayStr] = dateVal.split('-');
  const dirPath = `/archive/${year}/${monthStr}/${dayStr}/${typeVal}/${regionVal}/${deviceVal}`;
  const requestUrl = `/api/devices?path=${encodeURIComponent(dirPath)}`;

  try {
    const response = await fetch(requestUrl);

    if (!response.ok) {
      fileSelect.innerHTML = '<option value="" disabled selected>Конфигурация</option>';
      updateEditorModel(side, '');
      return;
    }

    const files = await response.json();
    fileSelect.innerHTML = '<option value="" disabled selected>Конфигурация</option>';

    if (!Array.isArray(files) || files.length === 0) {
      updateEditorModel(side, '');
      return;
    }

    files.forEach(file => {
      const opt = document.createElement('option');
      opt.value = file;
      opt.textContent = file;
      fileSelect.appendChild(opt);
    });

    // Пытаемся восстановить выбор файла (если он есть за эту дату) или оставляем текущий
    const targetFile = preferredFile || fileSelect.value;
    if (targetFile && files.includes(targetFile)) {
      fileSelect.value = targetFile;
      loadConfigFromBackend(side);
    } else {
      fileSelect.value = "";
      updateEditorModel(side, '');
    }

  } catch (e) {
    console.error(`[DEBUG ${side.toUpperCase()}] Ошибка:`, e);
    fileSelect.innerHTML = '<option value="" disabled selected>Конфигурация</option>';
    updateEditorModel(side, '');
  }
}

async function fetchFileList(side, preferredFile = null) {
  const isLeft = side === 'left';
  const dateVal = document.getElementById(isLeft ? 'dateLeft' : 'dateRight').value;
  const typeVal = document.getElementById(isLeft ? 'typeLeft' : 'typeRight').value;
  const regionVal = document.getElementById(isLeft ? 'regionLeft' : 'regionRight').value;
  const deviceVal = document.getElementById(isLeft ? 'deviceLeft' : 'deviceRight').value;
  const fileSelect = document.getElementById(isLeft ? 'fileLeft' : 'fileRight');

  if (!dateVal || !regionVal || !deviceVal) {
    fileSelect.innerHTML = '<option value="" disabled selected>Конфигурация</option>';
    return;
  }

  const [year, monthStr, dayStr] = dateVal.split('-');
  const dirPath = `/archive/${year}/${monthStr}/${dayStr}/${typeVal}/${regionVal}/${deviceVal}`;
  const requestUrl = `/api/devices?path=${encodeURIComponent(dirPath)}`;

  try {
    const response = await fetch(requestUrl);

    if (!response.ok) {
      fileSelect.innerHTML = '<option value="" disabled selected>Конфигурация</option>';
      updateEditorModel(side, '');
      return;
    }

    const files = await response.json();
    fileSelect.innerHTML = '<option value="" disabled selected>Конфигурация</option>';

    if (!Array.isArray(files) || files.length === 0) {
      updateEditorModel(side, '');
      return;
    }

    files.forEach(file => {
      const opt = document.createElement('option');
      opt.value = file;
      opt.textContent = file;
      fileSelect.appendChild(opt);
    });

    // Если файл, который был выбран до смены даты, присутствует на новой дате — выбираем его
    if (preferredFile && files.includes(preferredFile)) {
      fileSelect.value = preferredFile;
      loadConfigFromBackend(side); // Сразу автоматически загружаем конфиг
    } else {
      fileSelect.value = "";
      updateEditorModel(side, '');
    }
  } catch (e) {
    console.error(`[DEBUG ${side.toUpperCase()}] Ошибка:`, e);
    fileSelect.innerHTML = '<option value="" disabled selected>Конфигурация</option>';
    updateEditorModel(side, '');
  }
}

// Вызывается только при изменении селекта конкретного файла
function onFileChange(sourceSide) {
  const isSync = document.getElementById('syncPanels').checked;
  const targetSide = sourceSide === 'left' ? 'right' : 'left';

  if (isSync) {
    const sourceFile = document.getElementById(sourceSide === 'left' ? 'fileLeft' : 'fileRight').value;
    const targetFileSelect = document.getElementById(targetSide === 'left' ? 'fileLeft' : 'fileRight');

    // Пытаемся выбрать такой же файл в противоположной панели, если он там есть на её дату
    const hasOption = Array.from(targetFileSelect.options).some(opt => opt.value === sourceFile);
    if (hasOption) {
      targetFileSelect.value = sourceFile;
    }

    loadConfigFromBackend('left');
    loadConfigFromBackend('right');
  } else {
    loadConfigFromBackend(sourceSide);
  }
}

// Функция универсального заполнения селекта папками с сервера
async function fetchFolderList(dirPath, selectElement, defaultText) {
  try {
    const response = await fetch(`/api/folders?path=${encodeURIComponent(dirPath)}`);
    if (!response.ok) {
      selectElement.innerHTML = `<option value="" disabled selected>${defaultText} (не найдено)</option>`;
      window.location.reload();
      return;
    }

    const folders = await response.json();
    const currentValue = selectElement.value;

    selectElement.innerHTML = `<option value="" disabled selected>${defaultText}</option>`;

    if (!Array.isArray(folders) || folders.length === 0) {
      selectElement.innerHTML = `<option value="" disabled selected>Нет данных</option>`;
      return;
    }

    folders.forEach(folder => {
      const opt = document.createElement('option');
      opt.value = folder;
      opt.textContent = folder;
      selectElement.appendChild(opt);
    });

    if (folders.includes(currentValue)) {
      selectElement.value = currentValue;
    }
  } catch (e) {
    console.error(`Ошибка запроса папок для [${dirPath}]:`, e);
  }
}

// При смене даты, типа (ЦОД/ЛВС) или региона обновляем вложенные селекты



async function onTypeOrRegionChange(sourceSide, changeType = 'region') {
  const isSync = document.getElementById('syncPanels').checked;
  const targetSide = sourceSide === 'left' ? 'right' : 'left';

  // Если изменён именно селект "УЭС", принудительно сбрасываем значение селекта "МРФ"
  if (changeType === 'type') {
    const regionSourceEl = document.getElementById(sourceSide === 'left' ? 'regionLeft' : 'regionRight');
    if (regionSourceEl) regionSourceEl.value = "";

    if (isSync) {
      const regionTargetEl = document.getElementById(targetSide === 'left' ? 'regionLeft' : 'regionRight');
      if (regionTargetEl) regionTargetEl.value = "";
    }
  }

  // Сбрасываем Платформу и Конфигурацию (и редактор)
  resetDeviceSelect(sourceSide);
  resetFileSelectDropdown(sourceSide);

  if (isSync) {
    resetDeviceSelect(targetSide);
    resetFileSelectDropdown(targetSide);
  }

  // 1. Синхронизация УЭС и МРФ между панелями при включенном syncPanels
  if (isSync) {
    ['type', 'region'].forEach(field => {
      const sourceVal = document.getElementById(field + (sourceSide === 'left' ? 'Left' : 'Right')).value;
      document.getElementById(field + (targetSide === 'left' ? 'Left' : 'Right')).value = sourceVal;
    });
  }

  // 2. Подгружаем обновленный список Регионов и Платформ
  await updateDynamicDropdowns(sourceSide);
  if (isSync) {
    await updateDynamicDropdowns(targetSide);
  }
}

function resetRegionSelect(side) {
  const regionSelect = document.getElementById(side === 'left' ? 'regionLeft' : 'regionRight');
  if (regionSelect) {
    regionSelect.innerHTML = '<option value="" disabled selected>МРФ</option>';
  }
}


function resetDeviceSelect(side) {
  const deviceSelect = document.getElementById(side === 'left' ? 'deviceLeft' : 'deviceRight');
  if (deviceSelect) {
    deviceSelect.innerHTML = '<option value="" disabled selected>Платформа</option>';
  }
}

function resetFileSelectDropdown(side) {
  const fileSelect = document.getElementById(side === 'left' ? 'fileLeft' : 'fileRight');
  if (fileSelect) {
    fileSelect.innerHTML = '<option value="" disabled selected>Конфигурация</option>';
  }
  // Очищаем панель редактора, так как файл больше не выбран
  updateEditorModel(side, '');
}

function resetRegionSelectDropdown(side) {
  const fileSelect = document.getElementById(side === 'left' ? 'fileLeft' : 'fileRight');
  if (fileSelect) {
    fileSelect.innerHTML = '<option value="" disabled selected>Конфигурация</option>';
  }
  // Очищаем панель редактора, так как файл больше не выбран
  updateEditorModel(side, '');
}


async function updateDynamicDropdowns(side) {
  const isLeft = side === 'left';
  const dateVal = document.getElementById(isLeft ? 'dateLeft' : 'dateRight').value;
  const typeVal = document.getElementById(isLeft ? 'typeLeft' : 'typeRight').value;
  const regionSelect = document.getElementById(isLeft ? 'regionLeft' : 'regionRight');
  const deviceSelect = document.getElementById(isLeft ? 'deviceLeft' : 'deviceRight');

  // Если дата или тип (УЭС) еще не выбраны — очищаем регионы и платформы, ничего не запрашиваем
  if (!dateVal || !typeVal) {
    regionSelect.innerHTML = '<option value="" disabled selected>МРФ</option>';
    deviceSelect.innerHTML = '<option value="" disabled selected>Платформа</option>';
    return;
  }

  const [year, month, day] = dateVal.split('-');

  // Шаг А: Подгружаем доступные Регионы для /archive/YYYY/MM/DD/Type
  const typeDirPath = `/archive/${year}/${month}/${day}/${typeVal}`;
  await fetchFolderList(typeDirPath, regionSelect, 'МРФ');

  // Шаг Б: Если регион выбран, подгружаем доступные Платформы/ОС
  const regionVal = regionSelect.value;
  if (regionVal) {
    const regionDirPath = `${typeDirPath}/${regionVal}`;
    await fetchFolderList(regionDirPath, deviceSelect, 'Платформа');
  } else {
    deviceSelect.innerHTML = '<option value="" disabled selected>Платформа</option>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const today = getTodayDateString();
  const dateLeft = document.getElementById('dateLeft');
  const dateRight = document.getElementById('dateRight');

  if (dateLeft) dateLeft.max = today;
  if (dateRight) dateRight.max = today;

  // Синхронизируем текст кнопки с реальной темой из localStorage
  const savedTheme = localStorage.getItem('theme');
  const icon = document.getElementById('themeIcon');
  if (savedTheme === 'light') {
    if (icon) icon.textContent = "🌙 Ночь";
    currentTheme = 'vs';
  } else {
    if (icon) icon.textContent = "☀️ День";
    currentTheme = 'vs-dark';
  }
  if (typeof monaco !== 'undefined' && diffEditor) {
    monaco.editor.setTheme(currentTheme);
  }
});

function downloadConfig(side) {
  if (!diffEditor) return;

  const model = diffEditor.getModel();
  if (!model) return;

  const isLeft = side === 'left';
  const content = isLeft ? model.original.getValue() : model.modified.getValue();

  if (!content || content.trim() === '') {
    alert(`Панель ${isLeft ? 'L (слева)' : 'R (справа)'} пуста. Скачивать нечего!`);
    return;
  }

  const dateInput = document.getElementById(isLeft ? 'dateLeft' : 'dateRight');
  const fileSelect = document.getElementById(isLeft ? 'fileLeft' : 'fileRight');
  const deviceSelect = document.getElementById(isLeft ? 'deviceLeft' : 'deviceRight');

  // Получаем дату из календаря панели (например, "2026-09-18")
  const dateVal = dateInput && dateInput.value ? dateInput.value : '';
  let fileName = fileSelect && fileSelect.value ? fileSelect.value : '';

  if (!fileName) {
    const deviceName = deviceSelect && deviceSelect.value ? deviceSelect.value : 'config';
    fileName = `${deviceName}_${isLeft ? 'left' : 'right'}.txt`;
<!--  } else {-->
<!--    // Если у файла нет расширения, добавляем .txt-->
<!--    if (!fileName.includes('.')) {-->
<!--      fileName += '.txt';-->
<!--    }-->
  }

  // Если дата выбрана, добавляем её в начало имени файла: YYYY-MM-DD_filename.txt
  if (dateVal) {
    fileName = `${dateVal}_${fileName}`;
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

function downloadDiff() {
  if (!diffEditor) return;

  const model = diffEditor.getModel();
  if (!model || !model.original || !model.modified) return;

  const leftContent = model.original.getValue();
  const rightContent = model.modified.getValue();

  if (!leftContent.trim() && !rightContent.trim()) {
    alert('Обе панели пусты. Нечего сравнивать!');
    return;
      }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const currentTime = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

  // 1. Считываем значения всех селектов и полей ввода
  const getValue = (id, fallback) => {
    const el = document.getElementById(id);
    return el && el.value ? el.value : fallback;
  };

  const formatDate = (rawDate) => {
  if (!rawDate || !rawDate.includes('-')) return rawDate;
  const [year, month, day] = rawDate.split('-');
  return `${day}-${month}-${year}`;
};

  const dateL = formatDate(getValue('dateLeft', 'NoDate_L'));
  const typeL = getValue('typeLeft', 'NoType_L');
  const regionL = getValue('regionLeft', 'NoRegion_L');
  const deviceL = getValue('deviceLeft', 'NoDevice_L');
  const fileL = getValue('fileLeft', 'NoFile_L');

  const dateR = formatDate(getValue('dateRight', 'NoDate_R'));
  const typeR = getValue('typeRight', 'NoType_R');
  const regionR = getValue('regionRight', 'NoRegion_R');
  const deviceR = getValue('deviceRight', 'NoDevice_R');
  const fileR = getValue('fileRight', 'NoFile_R');

  // Формируем первую строку заголовка со всеми выбранными параметрами
  let diffOutput = `DIff: '(L) ${dateL} УЭС${typeL} ${regionL} ${fileL}' between '(R) ${dateR} УЭС${typeR} ${regionR} ${fileR}'\n----\n\n`;

  // 2. Построчно сравниваем конфиги
  const leftLines = leftContent.split(/\r?\n/);
  const rightLines = rightContent.split(/\r?\n/);
  const maxLines = Math.max(leftLines.length, rightLines.length);

  let diffCount = 0;

  for (let i = 0; i < maxLines; i++) {
    const lineL = leftLines[i] !== undefined ? leftLines[i] : '';
    const lineR = rightLines[i] !== undefined ? rightLines[i] : '';

    // Если строки отличаются
    if (lineL !== lineR) {
      diffCount++;
      const lineNumber = i + 1;

      // Записываем номер строки и различия
      diffOutput += `Line ${lineNumber}:\n`;
      diffOutput += `L: ${lineL}\n`;
      diffOutput += `R: ${lineR}\n\n`;
    }
  }

  // 3. Проверка на идентичность
  if (diffCount === 0) {
    alert('Конфигурации идентичны!');
    return;
  }

  // 4. Скачивание файла
  const fileName = `diff_${currentTime}.txt`;
  const blob = new Blob([diffOutput], { type: 'text/plain;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

function jumpToDiff(direction) {
  if (!diffEditor) return;

  const lineChanges = diffEditor.getLineChanges();
  if (!lineChanges || lineChanges.length === 0) {
    console.log('Различия не найдены или еще не рассчитаны');
    return;
  }

  const modifiedEditor = diffEditor.getModifiedEditor();
  const position = modifiedEditor.getPosition();
  const currentLine = position ? position.lineNumber : 1;

  // Извлекаем список начальных строк всех блоков изменений
  const diffLines = lineChanges.map(change => change.modifiedStartLineNumber).sort((a, b) => a - b);

  let targetLine = null;

  if (direction === 'next') {
    // Ищем первую строку диффа строго НИЖЕ текущей позиции
    targetLine = diffLines.find(line => line > currentLine);
    // Если дошли до конца — циклично переходим на самую первую разницу
    if (!targetLine) {
      targetLine = diffLines[0];
    }
  } else if (direction === 'prev') {
    // Ищем строку диффа ВЫШЕ текущей позиции
    const prevLines = diffLines.filter(line => line < currentLine);
    targetLine = prevLines.length > 0 ? prevLines[prevLines.length - 1] : diffLines[diffLines.length - 1];
  }

  if (targetLine !== null) {
    modifiedEditor.focus();

    // Перемещаем курсор на целевую строку
    modifiedEditor.setPosition({ lineNumber: targetLine, column: 1 });

    // revealLine(lineNumber, scrollType)
    // 0 соответствует сопоставлению со слабым скроллом, но чтобы строка встала
    // РОВНО В САМЫЙ ВЕРХ экрана, используем метод revealLineInCenter или передаем тип прокрутки
    // В Monaco 0.40+ аргумент '0' (ScrollType.Smooth) вместе с revealLine
    // сдвигает строку наверх, если использовать следующий трюк с scrollTop:

    const topPixel = modifiedEditor.getTopForLineNumber(targetLine);
    modifiedEditor.setScrollTop(topPixel);
  }
}
