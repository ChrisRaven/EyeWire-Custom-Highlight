// ==UserScript==
// @name         Custom Highlight
// @namespace    http://tampermonkey.net/
// @version      1.6.1.1
// @description  Allows highlighting any cubes
// @author       Krzysztof Kruk
// @match        https://*.eyewire.org/*
// @exclude      https://*.eyewire.org/1.0/*
// @downloadURL  https://raw.githubusercontent.com/ChrisRaven/EyeWire-Custom-Highlight/master/custom_highlight.user.js
// @require      https://chrisraven.github.io/EyeWire-Custom-Highlight/spectrum.js
// ==/UserScript==

/*jshint esversion: 6 */
/*globals $, account, indexedDB, tomni, Keycodes */

var LOCAL = false;
if (LOCAL) {
  console.log('%c--== TURN OFF "LOCAL" BEFORE RELEASING!!! ==--', "color: red; font-style: italic; font-weight: bold;");
}


(function() {
  'use strict';
  'esversion: 6';

  var K = {
    gid: function (id) {
      return document.getElementById(id);
    },

    qS: function (sel) {
      return document.querySelector(sel);
    },

    qSa: function (sel) {
      return document.querySelectorAll(sel);
    },


    addCSSFile: function (path) {
      $("head").append('<link href="' + path + '" rel="stylesheet" type="text/css">');
    },


    // Source: https://stackoverflow.com/a/6805461
    injectJS: function (text, sURL) {
      var
        tgt,
        scriptNode = document.createElement('script');

      scriptNode.type = "text/javascript";
      if (text) {
        scriptNode.textContent = text;
      }
      if (sURL) {
        scriptNode.src = sURL;
      }

      tgt = document.getElementsByTagName('head')[0] || document.body || document.documentElement;
      tgt.appendChild(scriptNode);
    },

    // localStorage
    ls: {
      get: function (key) {
        return localStorage.getItem(account.account.uid + '-ews-' + key);
      },

      set: function (key, val) {
        localStorage.setItem(account.account.uid + '-ews-' + key, val);
      },

      remove: function (key) {
        localStorage.removeItem(account.account.uid + '-ews-' + key);
      }
    }
  };


function Settings() {
    let target;
    
    this.setTarget = function (selector) {
      target = selector;
    };
    
    this.getTarget = function () {
      return target;
    };
    
    this.addCategory = function (id = 'ews-custom-highlight-settings-group', name = 'Custom Highlight') {
      if (!K.gid(id)) {
        $('#settingsMenu').append(`
          <div id="${id}" class="settings-group ews-settings-group invisible">
            <h1>${name}</h1>
          </div>
        `);
      }
      
      this.setTarget($('#' + id));
    };

    this.addOption = function (options) {
      let settings = {
        name: '',
        id: '',
        defaultState: false,
        indented: false
      }

      $.extend(settings, options);
      let storedState = K.ls.get(settings.id);
      let state;

      if (storedState === null) {
        K.ls.set(settings.id, settings.defaultState);
        state = settings.defaultState;
      }
      else {
        state = storedState.toLowerCase() === 'true';
      }

      target.append(`
        <div class="setting" id="${settings.id}-wrapper">
          <span>${settings.name}</span>
          <div class="checkbox ${state ? 'on' : 'off'}">
            <div class="checkbox-handle"></div>
            <input type="checkbox" id="${settings.id}" style="display: none;" ${state ? ' checked' : ''}>
          </div>
        </div>
      `);
      
      if (settings.indented) {
        K.gid(settings.id).parentNode.parentNode.style.marginLeft = '30px';
      }
      
      $(`#${settings.id}-wrapper`).click(function (evt) {
        evt.stopPropagation();

        let $elem = $(this).find('input');
        let elem = $elem[0];
        let newState = !elem.checked;

        K.ls.set(settings.id, newState);
        elem.checked = newState;

        $elem.add($elem.closest('.checkbox')).removeClass(newState ? 'off' : 'on').addClass(newState ? 'on' : 'off');
        $(document).trigger('ews-setting-changed', {setting: settings.id, state: newState});
      });
      
      $(document).trigger('ews-setting-changed', {setting: settings.id, state: state});
    };
    
    this.getValue = function (optionId) {
      let val = K.ls.get(optionId);
      
      if (val === null) {
        return undefined;
      }
      if (val.toLowerCase() === 'true') {
        return true;
      }
      if (val.toLowerCase() === 'false') {
        return false;
      }

      return val;
    }
  }


var CustomHighlight = function () {
  let _that = this;

  let initialColors = ['', '#d04f4f', '#2ecc71', '#e6c760', '#0000ff'];

  this.currentColorIndex = +K.ls.get('custom-highlight-index') || 1;

  function applyColor(color, index, inside = true) {
    var clr = inside ? color.toHexString() : color;

    K.gid('ews-custom-highlight-color-' + index).style.backgroundColor = clr;
    K.ls.set('custom-highlight-color-' + index, clr);

    if (highlight) {
      highlight.refresh();
      highlight.refresh('x');
    }
  }

  let ind = this.currentColorIndex;
  function colorSettingHTML(index) {
    return `
    <div id="ews-custom-highlight-color-label-${index}" style="display: block">
      <input type=radio name="ews-custom-highlight-color-radio-group" value=${index +
      (index == ind ? ' checked' : '')}>
      Highlight Color ${index}
      <div id="ews-custom-highlight-color-${index}" data-index=${index}></div>
    </div>`;
  }

  this.getColor = function (index) {
    return  K.ls.get('custom-highlight-color-' + index) || initialColors[index];
  };

  this.bgColor = function (index) {
    K.gid('ews-custom-highlight-color-' + index).style.backgroundColor = this.getColor(index);
  };

  let starterColor;
  let openedIndex;
  this.initSpectrum = function (index) {
    $('#ews-custom-highlight-color-' + index).spectrum({
      showInput: true,
      preferredFormat: 'hex',
      color: this.getColor(index),
      containerClassName: 'ews-color-picker',
      replacerClassName: 'ews-color-picker',
      show: function (color) {
        starterColor = color.toHexString();
        openedIndex = this.dataset.index;
      },
      move: function (color) {
        applyColor(color, index);
      },
      change: function (color) {
        applyColor(color, index);
      }
    });

    $('.sp-cancel').click(function () {
      applyColor(starterColor, openedIndex, false);
    });
  }

  $('#ews-custom-highlight-settings-group').append(
    colorSettingHTML(1) +
    colorSettingHTML(2) +
    colorSettingHTML(3)
  );

  $('#ews-custom-highlight-settings-group').append(`
    <div id="ews-custom-highlight-color-label-4" style="display: block">
    X-Highlight Color
    <div id="ews-custom-highlight-color-4" data-index=4></div>
  </div>`
  );


  this.bgColor(1);
  this.bgColor(2);
  this.bgColor(3);
  this.bgColor(4); // XColor

  this.initSpectrum(1);
  this.initSpectrum(2);
  this.initSpectrum(3);
  this.initSpectrum(4); // XColor

  $('.sp-cancel, .sp-choose').addClass('minimalButton');
  
  this.updateIndicator = function () {
    let index = this.currentColorIndex;

    K.gid('ews-current-color-indicator').innerHTML = index;
    K.gid('ews-current-color-indicator').style.color = this.getColor(index);
  };

  var
    _this = this,
    highlightButton = document.querySelector('.control.highlight button');

  $('body').append('<div id="ewsCustomHighlightedCells"><div id="ewsCustomHighlightedCellsWrapper"></div></div>');

   $('#ewsCustomHighlightedCells').dialog({
    autoOpen: false,
    hide: true,
    modal: true,
    show: true,
    dialogClass: 'ews-dialog',
    title: 'Cells containing your Custom Highlighted cubes',
    width: 800,
    open: function () {
      $('.ui-widget-overlay').click(function() { // close by clicking outside the window
        $('#ewsCustomHighlightedCells').dialog('close');
      });
    }
  });

  $('#cubeInspectorFloatingControls .controls').append(`
    <div class="control custom-highlight">
      <div class="children translucent flat active" title="Custom Highlight Children (v + up)">
        <div class="down-arrow"></div>
      </div>
      <button class="cube translucent flat minimalButton active" title="Custom Highlight" disabled="">V</button>
      <div id="ews-current-color-indicator">1</div>
      <div class="parents translucent flat active" title="Custom Highlight Parents (v + down)">
        <div class="up-arrow"></div>
      </div>
    </div>

    <div class="control custom-unhighlight">
      <div class="children translucent flat active" title="Custom Unhighlight Children (b + up)">
        <div class="down-arrow"></div>
      </div>
      <button class="cube translucent flat minimalButton active" title="Custom Unhighlight" disabled="">B</button>
      <div class="parents translucent flat active" title="Custom Unhighlight Parents (b + down)">
        <div class="up-arrow"></div>
      </div>
    </div>
  `);

  this.updateIndicator(); // initial setting of the indicator

  highlightButton.classList.add('active');

  this.updateXCounter = function (val) {console.log('called')
    if (typeof val === 'undefined') {
      val = this.db.get(tomni.getCurrentCell().info.id, null, 'x').length;
    }

    if (K.gid('x-counter')) {
      K.gid('x-counter').innerHTML = val;
    }
  }


  this.db = {};

  this.db.getAll = function (type) {
    let data = K.ls.get(type && type === 'x' ? 'custom-x-highlight-cubes' : 'custom-highlight-cubes');

    if (data) {
      return JSON.parse(data);
    }

    return [];
  };


  this.db.saveAll = function (data, type) {
    if (data) {
      K.ls.set(type && type === 'x' ? 'custom-x-highlight-cubes' : 'custom-highlight-cubes', JSON.stringify(data));
    }
  };


  this.db.add = function (data, highlight = true) {
    let currentData = this.getAll(data.type);
    let cell = currentData[data.cellId];
    data.cubes = Array.isArray(data.cubes) ? data.cubes : [data.cubes];

    if (!Object.keys(currentData).length) {
      currentData = {};
    }

    if (data.type && data.type === 'x') {
      if (K.ls.get('settings-x-highlight') !== 'true') {
        return;
      }
      if (!cell) {
        currentData[data.cellId] = {
          timestamp: Date.now(),
          name: data.name,
          dataset: data.dataset,
          cubes: []
        };
        currentData[data.cellId].cubes = data.cubes;
        _that.updateXCounter(data.cubes.length);
      }
      else {
        cell.timestamp = Date.now();
        cell.name = data.name; // in case, the name was changed
        cell.cubes.push(...data.cubes);
        cell.cubes = [...new Set(cell.cubes)];
        _that.updateXCounter(cell.cubes.length);
      }

      if (highlight) {
        _this.highlight(currentData[data.cellId].cubes, 4);
      }

      this.saveAll(currentData, 'x');
    }
    else {
      if (!cell) {
        currentData[data.cellId] = {
          timestamp: Date.now(),
          name: data.name,
          dataset: data.dataset,
          cubes: {1: [], 2: [], 3: []}
        };
        currentData[data.cellId].cubes[data.colorIndex] = data.cubes;
      }
      else {
        cell.timestamp = Date.now(),
        cell.name = data.name, // in case, the name was changed
        cell.cubes[data.colorIndex].push(...data.cubes);
        cell.cubes[data.colorIndex] = [...new Set(cell.cubes[data.colorIndex])];
      }
      
      if (highlight) {
        _this.highlight(currentData[data.cellId].cubes[data.colorIndex], data.colorIndex);
      }

      this.saveAll(currentData);
    }
  };

  this.db.get = function (cellId, colorIndex, type) {
    let currentData = this.getAll(type);
    let cell = currentData[cellId];

    if (cell) {
      if (colorIndex && (!type || type !== 'x')) {
        return cell.cubes[colorIndex];
      }

      return cell.cubes;
    }

    return [];
  };

  this.db.delete = function (cellId, cubes, colorIndex, highlight = true, type) {
    colorIndex = typeof colorIndex !== 'undefined' ? colorIndex : _this.currentColorIndex;
    cubes = Array.isArray(cubes) ? cubes : [cubes];

    let currentData = this.getAll(type);
    let cell = currentData[cellId];

    if (type && type === 'x') {
      if (K.ls.get('settings-x-highlight') !== 'true') {
        return;
      }
      if (cell) {
        cell.cubes = cell.cubes.filter(x => cubes.indexOf(x) === -1);
        _that.updateXCounter(cell.cubes.length);
        if (highlight) {
          _this.highlight(cell.cubes, 4);
        }

        this.saveAll(currentData, 'x');
      }
    }
    else {
     if (cell) {
        cell.cubes[colorIndex] = cell.cubes[colorIndex].filter(x => cubes.indexOf(x) === -1);
        if (highlight) {
          _this.highlight(cell.cubes[colorIndex], colorIndex);
        }

        this.saveAll(currentData);
      }
    }
  };

  this.db.deleteCell = function (cellId, type) {
    let currentData = this.getAll(type);
    let cell = currentData[cellId];

    if (cell && currentData[cellId]) {
      delete currentData[cellId];

      this.saveAll(currentData, type);
    }
  };


  this.highlight = function (cubeIds, index = this.currentColorIndex) {
    // zindex = 1, because the higlights object is processed using .forEach(), where the order of the indices
    // doesn't matter. Only order of adding items is important. By default the object
    // consists of objects with keys {1, 5, 6, 100}, so no matter, if I add 2, 10 or 1000, that
    // object will always be proceeded at the end overwriting settings from the previous objects
    // Luckily, the {1} object seems to be unused, while it can be still used for the Custom Highlighting
    // and the order in the highlights object won't change
    tomni.getCurrentCell().highlight({
      cubeids: cubeIds,
      color: this.getColor(index),
      zindex: index
    });
    tomni.getCurrentCell().update();
  };

  this.unhighlight = function (index = this.currentColorIndex) {
    tomni.getCurrentCell().unhighlight([index]);
    tomni.getCurrentCell().update();
  };

  this.highlightCell = function () {
    var
      result,
      cellId = this.getCurrentCellId();

      this.highlight(this.db.get(cellId, null, 'x'), 4);

      result = this.db.get(cellId);
      this.highlight(result[1], 1);
      this.highlight(result[2], 2);
      this.highlight(result[3], 3);
  };

  this.getCurrentCubeId = function () {
    return tomni.getTarget()[0].id;
  };

  this.getCurrentCellId = function () {
    return tomni.getCurrentCell().id;
  };

  this.add = function (direction, type, cubeId) {
    cubeId = cubeId || this.getCurrentCubeId();
    let cellId = this.getCurrentCellId();
    let info = tomni.getCurrentCell().info;

    if (direction && (direction.parents || direction.children)) {
      this.addRelatives(direction, cubeId);
    }
    else {
      this.db.add({
        type: type && type === 'x' ? 'x' : undefined,
        cellId: cellId,
        cubes: cubeId,
        name: info.name,
        dataset: info.dataset_id,
        colorIndex: this.currentColorIndex
      });
    }
  };

  this.addRelatives = function (direction, self) {
    let
      dataToUse,
      _this = this,
      cellId = this.getCurrentCellId();

    $.getJSON('/1.0/task/' + self + '/hierarchy', function (data) {
      dataToUse = direction.parents ? data.ancestors : data.descendants;
      dataToUse.push(self);

      let info = tomni.getCurrentCell().info;

      _this.db.add({
        cellId: cellId,
        cubes: dataToUse,
        name: info.name,
        dataset: info.dataset_id,
        colorIndex: _this.currentColorIndex
      });
    });
  };

  this.remove = function (direction, type, cubeId) {
    cubeId = cubeId || this.getCurrentCubeId();

    let cellId = this.getCurrentCellId();
    let unhighlightAll = K.ls.get('settings-unhighlight-all');

    if (type && type === 'x') {
      this.db.delete(cellId, [cubeId], null, true, 'x');
      let result = this.db.getAll('x');
      if (!result[cellId] || !result[cellId].cubes || !result[cellId].cubes.length) {
        this.db.deleteCell(cellId, 'x');
      }
    }
    else {
      if (direction && (direction.parents || direction.children)) {
        this.removeRelatives(direction, cubeId);
      }
      else {
        if (unhighlightAll && unhighlightAll === 'true') {
          this.db.delete(cellId, [cubeId], 1);
          this.db.delete(cellId, [cubeId], 2);
          this.db.delete(cellId, [cubeId], 3);
        }
        else {
          this.db.delete(cellId, [cubeId]);
        }

        let result = this.db.getAll();
        if (result && result[cellId]) {
          let cubes = result[cellId].cubes;
      
          if (!cubes[1].length && !cubes[2].length && !cubes[3].length) {
            this.db.deleteCell(cellId);
          }
        }
      }
    }
  };


  this.removeRelatives = function (direction, self) {
    let
      dataToUse,
      cellId = this.getCurrentCellId(),
      unhighlightAll = K.ls.get('settings-unhighlight-all');

    $.getJSON('/1.0/task/' + self + '/hierarchy', function (data) {
      dataToUse = direction.parents ? data.ancestors : data.descendants;
      dataToUse.push(self);
      if (unhighlightAll && unhighlightAll === 'true') {
        _this.db.delete(cellId, dataToUse, 1);
        _this.db.delete(cellId, dataToUse, 2);
        _this.db.delete(cellId, dataToUse, 3);
      }
      else {
        _this.db.delete(cellId, dataToUse, _this.currentColorIndex);
      }

      let result = _this.db.getAll();
      if (result && result[cellId]) {
        let cubes = result[cellId].cubes;
    
        if (!cubes[1].length && !cubes[2].length && !cubes[3].length) {
          _this.db.deleteCell(cellId);
        }
      }
    });
  };

  this.removeCell = function (cellId, type) {
    this.db.deleteCell(cellId, type);
    if (cellId === this.getCurrentCellId()) {
      if (type && type === 'x') {
        this.unhighlight(4);
      }
      else {
        this.unhighlight(1);
        this.unhighlight(2);
        this.unhighlight(3);
      }
    }
  };

  this.refresh = function (type) {
    let
      cellId = this.getCurrentCellId(),
      result = this.db.get(cellId, null, type);

    if (type && type === 'x') {
      _this.highlight(result, 4);
    }
    else {
      _this.highlight(result[1], 1);
      _this.highlight(result[2], 2);
      _this.highlight(result[3], 3);
    }
  };


  this.showList = function () {
    var
      html = '';

    html += `
      <div class="ewsNavButtonGroup" id="ews-custom-highlight-period-selection">
        <div class="ewsNavButton" data-time-range="day">last 24h</div>
        <div class="ewsNavButton" data-time-range="week">last 7 days</div>
        <div class="ewsNavButton" data-time-range="month">last 30 days</div>
        <div class="ewsNavButton selected" data-time-range="allthetime">all the time</div>
      </div>
      <div class="ewsNavButtonGroup" id="ews-custom-highlight-dataset-selection">
        <div class="ewsNavButton" data-type="1">Mouse's Retina</div>
        <div class="ewsNavButton" data-type="11">Zebrafish's Hindbrain</div>
        <div class="ewsNavButton selected" data-type="both">Both</div>
      </div>
    `;
    html += '<table id="ews-custom-highlight-results">';
    html += `<thead><tr>
      <th># of Highlights</th>
      <th>Cell Name</th>
      <th>Cell ID</th>
      <th>Timestamp</th>
      <th>&nbsp;</th>
    </tr></thead>`;
    html += '<tbody>';

    let row;
    let results = this.db.getAll();
    for (let id in results) {
      if (results.hasOwnProperty(id)) {
        row = results[id];
        html += `<tr
          data-cell-id="${id}"
          data-timestamp="${row.timestamp}"
          data-dataset-id="${row.dataset}"
        >
          <td>` +
            (row.cubes[1] ? (`<span style="color: ` + _this.getColor(1) + `;">` + (row.cubes[1].length || '')) + ` </span>` : '') +
            (row.cubes[2] ? (`<span style="color: ` + _this.getColor(2) + `;">` + (row.cubes[2].length || '')) + ` </span>` : '') +
            (row.cubes[3] ? (`<span style="color: ` + _this.getColor(3) + `;">` + (row.cubes[3].length || '')) + ` </span>` : '') +
          `</td>
          <td class="custom-highlighted-cell-name">${row.name}</td>
          <td>${id}</td>
          <td>${(new Date(row.timestamp)).toLocaleString()}</td>
          <td><button class="minimalButton">Remove</button></td>
        </tr>`;
      }
    }
    html += '</tbody>';

    let xResults = this.db.getAll('x');
    for (let id in xResults) {
      if (xResults.hasOwnProperty(id)) {
        row = xResults[id];
        html += `<tr
          data-cell-id="${id}"
          data-timestamp="${row.timestamp}"
          data-dataset-id="${row.dataset}"
          data-type="x"
        >
          <td>` +
            `<span style="color: ` + _this.getColor(4) + `;">` + (row.cubes.length || '') + ` </span>` +
          `</td>
          <td class="custom-highlighted-cell-name">${row.name}</td>
          <td>${id}</td>
          <td>${(new Date(row.timestamp)).toLocaleString()}</td>
          <td><button class="minimalButton">Remove</button></td>
        </tr>`;
      }
    }
    html += '</tbody>';

    html += '</table>';

    K.gid('ewsCustomHighlightedCellsWrapper').innerHTML = html;
    $('#ewsCustomHighlightedCells').dialog('open');
  };


  this.filter = function (period, type) {
    var
      range,
      day = 1000 * 60 * 60 * 24,
      now = Date.now(),
      rows = document.querySelectorAll('#ews-custom-highlight-results tbody tr');

      switch (period) {
        case 'day': range = now - day; break;
        case 'week': range = now - 7 * day; break;
        case 'month': range = now - 30 * day; break;
        case 'allthetime': range = 0; break;
      }


      for (let row of rows) {
        if (row.dataset.timestamp >= range && (type === 'both' || row.dataset.datasetId == type)) {
          row.style.display = 'table-row';
        }
        else {
          row.style.display = 'none';
        }
      }
  };


  // source: https://stackoverflow.com/a/10828021
  K.injectJS(`
    $(window)
      .on(InspectorPanel.Events.ModelFetched, function () {
        $(document).trigger('model-fetched-triggered.custom-highlight');
      })
      .on('cell-info-ready', function (e, data) {
        $(document).trigger('cell-info-ready-triggered.custom-highlight', data);
      })
      .on('cube-leave', function (e, data) {
        $(document).trigger('cube-leave-triggered.custom-highlight', data);
      })
      .on('keyup.InspectorPanel.HotKeys', function (e) {
        e.type = 'hotkey-event-triggered';
        $(document).trigger(e);
      });
  `);


  // source: https://beta.eyewire.org/static/js/omni.js
  var controlset = ['highlight', 'unhighlight', 'xhighlight', 'xunhighlight'];
  var BUTTON_DESCRIPTIONS = {
    highlight: {
      hotkey: 'v',
      options: ['cube', 'parents', 'children'],
      fn: _this.add
    },
    unhighlight: {
      hotkey: 'b',
      options: ['cube', 'parents', 'children'],
      fn: _this.remove
    },
    // here only for the ease of using (x+x) and (z+z) shortcuts. The actual button isn't triggered by the combination
    xhighlight: {
      hotkey: 'x',
      options: ['cube', 'x-highlight'],
      fn: _this.add
    },
    xunhighlight: {
      hotkey: 'z',
      options: ['cube', 'x-highlight'],
      fn: _this.remove
    }
  };

  var _hotkeys = {};

  controlset.forEach(function (name) {
    var desc = BUTTON_DESCRIPTIONS[name];
    var basekey = desc.hotkey;

    if (desc.options.indexOf('cube') !== -1) {
      if (desc.options.indexOf('x-highlight') !== -1) {
        _hotkeys[basekey + basekey] = desc.fn.bind(_this, {}, 'x');
      }
      else {
        _hotkeys[basekey + basekey] = desc.fn.bind(_this);
      }
    }
    if (desc.options.indexOf('parents') !== -1) {
      _hotkeys[basekey + 'up'] = desc.fn.bind(_this, {parents: true});
    }
    if (desc.options.indexOf('children') !== -1) {
      _hotkeys[basekey + 'down'] = desc.fn.bind(_this, {children: true});
    }
  });

  let doc = $(document);

  doc.on('change', 'input[name="ews-custom-highlight-color-radio-group"]', function() {
    let val = this.value;
    _this.currentColorIndex = val;
    K.ls.set('custom-highlight-index', val);
    
    _this.updateIndicator();
  });

  doc.on('cell-info-ready-triggered.custom-highlight', function () {
    _this.highlightCell();
    _that.updateXCounter();
  });

  doc.on('cube-leave-triggered.custom-highlight', function () {
    _this.refresh();
    _this.refresh('x');
  });

  doc.on('model-fetched-triggered.custom-highlight', function () {
    if (tomni.getTarget()) {
      $('.custom-highlight button').css({
        'color': '#14b866',
        'border-color': '#14b866',
        'cursor': 'pointer'
      })
      .addClass('active')
      .prop('disabled', false);

      $('.custom-unhighlight button').css({
        'color': '#e6ac43',
        'border-color': '#e6ac43',
        'cursor': 'pointer'
      })
      .addClass('active')
      .prop('disabled', false);
    }
    else {
      $('.custom-highlight button').css({
        'color': '#e4e1e1',
        'border-color': '#434343',
        'cursor': 'auto'
      })
      .removeClass('active')
      .prop('disabled', true);

      $('.custom-unhighlight button').css({
        'color': '#e4e1e1',
        'border-color': '#434343',
        'cursor': 'auto'
      })
      .removeClass('active')
      .prop('disabled', true);
    }
  });

  doc.on('click', '#ews-custom-highlight-period-selection .ewsNavButton, #ews-custom-highlight-dataset-selection .ewsNavButton', function () {
    var
      period, type;

    $(this)
      .parent()
        .find('.ewsNavButton')
          .removeClass('selected')
        .end()
      .end()
      .addClass('selected');

    period = $('#ews-custom-highlight-period-selection .selected').data('timeRange');
    type = $('#ews-custom-highlight-dataset-selection .selected').data('type');

    _this.filter(period, type);
  });


  doc.on('hotkey-event-triggered', function (evt) {
    if (tomni.gameMode) {
      return;
    }


    var prevkeys = Keycodes.lastKeys(1).join('');

    if (Keycodes.keys[evt.keyCode] !== prevkeys) {
      return;
    }

    var fn;
    prevkeys = Keycodes.lastKeys(2).join('');
    fn = _hotkeys[prevkeys];

    // var exceptions = ['enter', 'mm', 'hh', 'hup', 'hdown'];

    if (fn) {
      fn();
      Keycodes.flush(2);
    }
  });

  doc
    .on('click', '.custom-highlight button', function () {
      if (this.classList.contains('active')) {
      _this.add();
      }
    })
    .on('click', '.custom-unhighlight button', function () {
      if (this.classList.contains('active')) {
        _this.remove();
      }
    })
    .on('click', '.custom-highlight .down-arrow', function () {
      if ($('.custom-highlight button').hasClass('active')) {
        _this.add({children: true});
      }
    })
    .on('click', '.custom-unhighlight .down-arrow', function () {
      if ($('.custom-unhighlight button').hasClass('active')) {
        _this.remove({children: true});
      }
    })
    .on('click', '.custom-highlight .up-arrow', function () {
      if ($('.custom-highlight button').hasClass('active')) {
        _this.add({parents: true});
      }
    })
    .on('click', '.custom-unhighlight .up-arrow', function () {
      if ($('.custom-unhighlight button').hasClass('active')) {
        _this.remove({parents: true});
      }
    })
    .on('click', '.control.highlight button', function () {
      if (this.classList.contains('active')) {
        _this.showList();
      }
    })
    .on('click', '#cubeInspectorFloatingControls .controls .inspect .parents', function () {
      let cellId = tomni.cell;

      $.when(
        $.getJSON("/1.0/cell/" + cellId + "/tasks"),
        $.getJSON("/1.0/cell/" + cellId + "/heatmap/scythe"),
        $.getJSON("/1.0/cell/" + cellId + "/tasks/complete/player")
      )
      .done(function (tasks, scythe, completed) {
        let potential, complete, uid, completedByMe;
        let cellId = _this.getCurrentCellId();
        let info = tomni.getCurrentCell().info;
        
  
        tasks = tasks[0];
        complete = scythe[0].complete || [];
        completed = completed[0];
  
        
        potential = tasks.tasks.filter(x => (x.status === 0 || x.status === 11) && x.weight >= 3);
        potential = potential.map(x => x.id);
        complete = complete.filter(x => x.votes >= 2 && !account.account.admin);
        complete = complete.map(x => x.id);
        potential = potential.filter(x => complete.indexOf(x) === -1);
  
        uid = account.account.uid;
        if (completed && completed.scythe[uid] && completed.scythe[uid].length) {
          // otherwise the concat() function will add "undefined" at the end of the table if the admin table is empty
          if (completed.admin[uid]) {
            completedByMe = completed.scythe[uid].concat(completed.admin[uid]);
          }
          else {
            completedByMe = completed.scythe[uid];
          }
        }
        else {
          completedByMe = [];
        }
        potential = potential.filter(x => completedByMe.indexOf(x) === -1);
  
        tasks = tasks.tasks.filter(el => potential.indexOf(el.id) === -1);
        tasks = tasks.map(el => el.id);

        _this.db.deleteCell(cellId);
        _this.db.add({
          cellId: cellId,
          cubes: tasks,
          name: info.name,
          dataset: info.dataset_id,
          colorIndex: _this.currentColorIndex
        });
        _this.refresh();
        _this.refresh('x');
      });
    })
    .on('click', '#cubeInspectorFloatingControls .controls .showmeme .parents', function () { // x-highlight
      let currentCellId = _this.getCurrentCellId();
      let cubes = _this.db.get(currentCellId, null, 'x');
      let convertToSCHighlights = K.ls.get('settings-convert-x-highlights-to-sced-highlights') === 'true';

      if (!cubes) {
        return;
      }

      cubes.forEach(cube => {
        $.post('/1.0/task/' + cube, {
					action: 'complete',
        }, 'json')
        .done(function () {
          _this.remove(null, 'x', cube);
          if (convertToSCHighlights) {
            _this.add(null, null, cube);
          }
        });
      })

    })
    .on('contextmenu', '#cubeInspectorFloatingControls .controls .inspect .parents', function (evt) {
      evt.stopPropagation();
      evt.preventDefault();
      _this.db.deleteCell( _this.getCurrentCellId());
      _this.refresh();
      _this.refresh('x');
    });

  doc
    .on('click', '.custom-highlighted-cell-name', function () {
      tomni.setCell({id: this.nextElementSibling .innerHTML});
    })
    .on('click', '#ewsCustomHighlightedCellsWrapper button', function () {
      var
        cellId = this.parentNode.previousElementSibling.previousElementSibling.innerHTML,
        row = this.parentNode.parentNode,
        type = row.dataset.type;

      _this.removeCell(parseInt(cellId, 10), type);
      row.remove();
    })
    .on('ews-setting-changed', function (evt, data) {
      if (data.setting === 'settings-show-higlight-unavailable-for-sc-cubes-button') {
        K.qS('#cubeInspectorFloatingControls .controls .inspect .parents').style.display = data.state ? 'block' : 'none';
        K.qS('#cubeInspectorFloatingControls .controls .inspect .parents').title = data.state ? 'Highlight unavailable for SC cubes (right-click to remove all highlights)' : '';
      }
      else if (data.setting === 'settings-convert-x-highlights-to-sced-highlights') {
        //
      }
      else if (data.setting === 'settings-x-highlight') {
        let xButton = K.qS('#cubeInspectorFloatingControls .controls .showmeme .parents');
        if (data.state) {
          
          xButton.style.display = 'block';
          xButton.title = 'SC X-highlighted cubes';
          let xCounter = K.gid('x-counter');
          if (!xCounter) {
            xCounter = document.createElement('div');
            xCounter.id = 'x-counter';
            xButton.appendChild(xCounter);
          }
          else {
            xCounter.style.display ='block';
          }
          K.gid('ews-custom-highlight-color-label-4').style.display = 'block';
          K.gid('settings-convert-x-highlights-to-sced-highlights-wrapper').style.display = 'block';
        }
        else {
          xButton.style.display = 'none';
          xButton.title = '';
          if (K.gid('x-counter')) {
            K.gid('x-counter').style.display = 'none';
          }
          K.gid('ews-custom-highlight-color-label-4').style.display = 'none';
          K.gid('settings-convert-x-highlights-to-sced-highlights-wrapper').style.display = 'none';
        }
      }
    });

    document.querySelector('.control.highlight button').disabled = false;
    document.querySelector('.control.highlight button').title = 'Show list of cells with custom highlighted cubes';
};




// source: https://stackoverflow.com/a/14488776
// to allow html code in the title option of a dialog window
$.widget('ui.dialog', $.extend({}, $.ui.dialog.prototype, {
  _title: function(title) {
    if (!this.options.title) {
      title.html('&#160;');
    }
    else {
      title.html(this.options.title);
    }
  }
}));



let highlight;

function main() {
  if (LOCAL) {
    K.addCSSFile('http://127.0.0.1:8887/styles.css');
    K.addCSSFile('http://127.0.0.1:8887/spectrum.css');
  }
  else {
    K.addCSSFile('https://chrisraven.github.io/EyeWire-Custom-Highlight/styles.css?v=5');
    K.addCSSFile('https://chrisraven.github.io/EyeWire-Custom-Highlight/spectrum.css?v=1');
  }

  if (account.can('scout scythe mystic admin')) {
    let intv = setInterval(function () {
      if (!K.gid('cubeInspectorFloatingControls')) {
        return;
      }

      clearInterval(intv);

      let settings = new Settings();

      let checked = K.ls.get('settings-unhighlight-all') === 'true';
      settings.addCategory();
      settings.addOption({
        name: 'Unhighlight all colors at once',
        id: 'settings-unhighlight-all',
        state: checked,
        defaultState: false
      });

      // new object must be created after the first setting, because it depends on the settings,
      // but before the second setting, because the second setting depends on the new object
      highlight = new CustomHighlight();

      if (account.can('scythe mystic admin')) {
        checked = K.ls.get('settings-show-higlight-unavailable-for-sc-cubes-button') === 'true';
        settings.addOption({
          name: 'Show "Highlight unavailable for SC cubes" button',
          id: 'settings-show-higlight-unavailable-for-sc-cubes-button',
          state: checked,
          defaultState: false
        });

        K.qS('#cubeInspectorFloatingControls .controls .inspect .parents').title = 'Highlight unavailable for SC cubes (right-click to remove all highlights)';

        // checked = K.ls.get('settings-convert-x-highlights-to-sced-highlights') === 'true';
        settings.addOption({
          indented: true,
          name: 'Convert X-highlights to SCed highlights',
          id: 'settings-convert-x-highlights-to-sced-highlights',
          state: checked,
          defaultState: false
        });

        settings.addOption({
          name: 'X Highlight',
          id: 'settings-x-highlight',
          defaultState: false
        });

        $('#settings-convert-x-highlights-to-sced-highlights-wrapper').insertAfter('#settings-x-highlight-wrapper');
        $('#ews-custom-highlight-color-label-4').insertAfter('#settings-x-highlight-wrapper');

        K.qS('#cubeInspectorFloatingControls .controls .showmeme .parents').title = 'SC X-highlighted cubes';
      }

      
      $(document).keyup(function (evt) {
        if (evt.which !== 84) {
          return;
        }

        let index = highlight.currentColorIndex + 1;
        if (index > 3) {
          index = 1;
        }
        K.ls.set('custom-highlight-index', index);
        highlight.currentColorIndex = index;
        K.qS('#ews-custom-highlight-color-label-' + index + ' input').checked = true;
        highlight.updateIndicator();
      });
    }, 50);
  }
}


var intv = setInterval(function () {
  if (typeof account === 'undefined' || !account.account.uid) {
    return;
  }
  clearInterval(intv);
  main();
}, 100);



})();
