// ==UserScript==
// @name         Custom Highlight
// @namespace    http://tampermonkey.net/
// @version      1
// @description  Allows highlighting any cubes
// @author       Krzysztof Kruk
// @match        https://*.eyewire.org/*
// @exclude      https://*.eyewire.org/1.0/*
// @downloadURL  https://raw.githubusercontent.com/ChrisRaven/EyeWire-Custom-Highlight/master/custom_highlight.user.js
// @require      https://chrisraven.github.io/EyeWire-Custom-Highlight/spectrum.js
// ==/UserScript==

/*jshint esversion: 6 */
/*globals $, account, indexedDB, tomni, Keycodes */

const LOCAL = true;
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


  var intv = setInterval(function () {
    if (typeof account === 'undefined' || !account.account.uid) {
      return;
    }
    clearInterval(intv);
    main();
  }, 100);

  function main() {

  // indexedDB
  const DB_NAME = 'ews';
  const DB_VERSION = 1;
  const DB_STORE_NAME = account.account.uid + '-ews-custom-highlight';

  function Database() {
    var getStore = function (mode, method, args, callback_success) {
      var
        db;

      db = indexedDB.open(DB_NAME, DB_VERSION);
      db.onsuccess = function () {
        var
          store, req;

        db = db.result;
        store = db.transaction(DB_STORE_NAME, mode).objectStore(DB_STORE_NAME);
        req = store[method](args);
        req.onerror = function (evt){};
        if (callback_success && typeof callback_success === 'function') {
          req.onsuccess = function (evt) {
            callback_success(evt.target.result);
          };
        }
      };

      db.onupgradeneeded = function (evt) {
        evt.target.result.createObjectStore(DB_STORE_NAME, {keyPath: 'cellId'});
      };
    };


    this.clearStore = function (callback) {
      getStore('readwrite', 'clear', null, callback);
    };

    this.add = function (data, callback) {
      getStore('readwrite', 'add', data, callback);
    };

    this.put = function (data, callback) {
      getStore('readwrite', 'put', data, callback);
    };

    this.get = function (key, callback) {
      getStore('readonly', 'get', key, callback);
    };

    this.delete = function (key, callback) {
      getStore('readwrite', 'delete', key, callback);
    };

    this.openCursor = function (callback) {
      getStore('readwrite', 'openCursor', null, callback);
    };
  }
  // end: indexedDB



var CustomHighlight = function () {
  if (!K.ls.get('custom-highlight-color-update-2018-01-09')) {
    db.openCursor(function (cursor) {
      if (cursor) {
        cursor.value.cellId = cursor.value.cellId + '-1';
        db.put(cursor);
        cursor.continue();
      }
    });

    K.ls.set('custom-highlight-color-update-2018-01-09', true);
  }

  let defaultSelectedIndex = K.ls.get('custom-highlight-index') || 1;

  if (!K.gid('ews-settings-group')) {
    $('#settingsMenu').append(`
      <div id="ews-settings-group" class="settings-group ews-settings-group invisible">
        <h1>Stats Settings</h1>
      </div>
    `);
  }

  let initialColors = ['', '#FF0000', '#00FF00', '#0000FF'];

  function applyColor(color, index, inside = true) {
    var clr = inside ? color.toHexString() : color;

    K.gid('ews-custom-highlight-color-' + index).style.backgroundColor = clr;
    K.ls.set('custom-highlight-color-' + index, clr);

    if (highlight) {
      highlight.refresh();
    }
  }

  function colorSettingHTML(index) {
    return `
    <div id="ews-custom-highlight-color-label-` + index + `" style="display: block">
      <input type=radio name="ews-custom-highlight-color-radio-group" value=` + index +
      (index == defaultSelectedIndex ? ' checked' : '') + `>
      Highlight Color ` + index + `
      <div id="ews-custom-highlight-color-` + index + `" data-index=` + index + `></div>
    </div>`;
  }

  function bgColor(index) {
    K.gid('ews-custom-highlight-color-' + index).style.backgroundColor = K.ls.get('custom-highlight-color-' + index) || initialColors[index];
  }

  let starterColor;
  let openedIndex;
  function initSpectrum(index) {
    $('#ews-custom-highlight-color-' + index).spectrum({
      showInput: true,
      preferredFormat: 'hex',
      color: K.ls.get('custom-highlight-color-' + index) || initialColors[index],
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

  $('#ews-settings-group').append(
    colorSettingHTML(1) +
    colorSettingHTML(2) +
    colorSettingHTML(3)
  );

  bgColor(1);
  bgColor(2);
  bgColor(3);

  initSpectrum(1);
  initSpectrum(2);
  initSpectrum(3);

  $('.sp-cancel, .sp-choose').addClass('minimalButton');


  var
    _this = this,
    currentCellId = '',
    highlightButton = document.querySelector('.control.highlight button');

  this.currentColorIndex = 1; // 1|2|3

  $('body').append('<div id="ewsCustomHighlightedCells"><div id="ewsCustomHighlightedCellsWrapper"></div></div>');

   $('#ewsCustomHighlightedCells').dialog({
    autoOpen: false,
    hide: true,
    modal: true,
    show: true,
    dialogClass: 'ews-dialog',
    title: 'Cells containing your Custom Highlighted cubes',
    width: 800,
    open: function (event, ui) {
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


  highlightButton.classList.add('active');


  function getColor(index) {
    return  K.ls.get('custom-highlight-color-' + index) || initialColors[index];
  }

  this.highlight = function (cellId, cubeIds, index = this.currentColorIndex) {
    // zindex = 1, because the higlights object is processed using .forEach(), where the order of the indices
    // doesn't matter. Only order of adding items is important. By default the object
    // consists of objects with keys {1, 5, 6, 100}, so no matter, if I add 2, 10 or 1000, that
    // object will always be proceeded at the end overwriting settings from the previous objects
    // Luckily, the {1} objects seems to ne unused, while it can be still used for the Custom Highlighting
    // and the order in the highlights object won't change
    tomni.getCurrentCell().highlight({
      cubeids: cubeIds,
      color: getColor(index),
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
      cellId = this.getCurrentCellId();

      if (cellId !== currentCellId) {
        db.get(cellId + '-1', function (result) {
          if (result) {
            _this.highlight(cellId, result.cubeIds, 1);
            currentCellId = cellId;
          }
        });
        db.get(cellId + '-2', function (result) {
          if (result) {
            _this.highlight(cellId, result.cubeIds, 2);
            currentCellId = cellId;
          }
        });
        db.get(cellId + '-3', function (result) {
          if (result) {
            _this.highlight(cellId, result.cubeIds, 3);
            currentCellId = cellId;
          }
        });
      }
  };

  this.getCurrentCubeId = function () {
    return tomni.getTarget()[0].id;
  };

  this.getCurrentCellId = function () {
    return tomni.getCurrentCell().id;
  };

  this.add = function (direction) {
    var
      cubes, cellName,
      cubeId = this.getCurrentCubeId(),
      cellId = this.getCurrentCellId();

    if (direction && (direction.parents || direction.children)) {
      this.addRelatives(direction, cubeId);
    }
    else {
      db.get(cellId + '-' + _this.currentColorIndex, function (result) {
        if (!result) {
          cubes = [cubeId];
          cellName = tomni.getCurrentCell().info.name;
        }
        else {
          // source: https://stackoverflow.com/a/38940354
          cubes = [...new Set([...result.cubeIds, cubeId])];
          cellName = result.name;
        }

        db.put({
          cellId: cellId + '-' + _this.currentColorIndex,
          cubeIds: cubes,
          timestamp: Date.now(),
          name: cellName,
          datasetId: tomni.getCurrentCell().info.dataset_id
          }, function () {
            _this.highlight(cellId, cubes);
        });
      });
    }
  };


  this.addRelatives = function (direction, self) {
    var
      dataToUse, cubes, cellName,
      cellId = this.getCurrentCellId();

    $.getJSON('/1.0/task/' + self + '/hierarchy', function (data) {
      dataToUse = direction.parents ? data.ancestors : data.descendants;
      db.get(cellId + '-' + _this.currentColorIndex, function (result) {
        if (!result) {
          cubes = [...dataToUse, self];
          cellName = tomni.getCurrentCell().info.name;
        }
        else {
          cubes = [...new Set([...result.cubeIds, ...dataToUse, self])];
          cellName = result.name;
        }
        db.put({
          cellId: cellId + '-' + _this.currentColorIndex,
          cubeIds: cubes,
          timestamp: Date.now(),
          name: cellName,
          datasetId: tomni.getCurrentCell().info.dataset_id
          }, function () {
            _this.highlight(cellId, cubes);
        });
      });
    });
  };


  this.remove = function (direction) {
    var
      index, cubes,
      cubeId = this.getCurrentCubeId(),
      cellId = this.getCurrentCellId();

    if (direction && (direction.parents || direction.children)) {
      this.removeRelatives(direction, cubeId);
    }
    else {
      db.get(cellId + '-' + this.currentColorIndex, function (result) {
        if (result) {
          index = result.cubeIds.indexOf(cubeId);
          if (index > -1) {
            result.cubeIds.splice(index, 1);
            result.timestamp = Date.now();
            db.put(result);
            _this.highlight(cellId, cubes);
          }
        }
      });
    }
  };


  this.removeRelatives = function (direction, self) {
    var
      dataToUse,
      cellId = this.getCurrentCellId();

    $.getJSON('/1.0/task/' + self + '/hierarchy', function (data) {
      dataToUse = direction.parents ? data.ancestors : data.descendants;
      dataToUse.push(self);
      db.get(cellId + '-' + _this.currentColorIndex, function (result) {
        var cubes;

        if (result) {
          // source: https://stackoverflow.com/a/33034768
          cubes = result.cubeIds.filter(x => dataToUse.indexOf(x) == -1);
          result.cubeIds = cubes;
          result.timestamp = Date.now();
          db.put(result);
          _this.highlight(cellId, cubes);
        }
      });
    });
  };

  this.removeCell = function (cellId) {
    db.delete(cellId + '-1', function () {
      if (cellId == tomni.cell) {
        _this.unhighlight(1);
      }
    });
    db.delete(cellId + '-2', function () {
      if (cellId == tomni.cell) {
        _this.unhighlight(2);
      }
    });
    db.delete(cellId + '-3', function () {
      if (cellId == tomni.cell) {
        _this.unhighlight(3);
      }
    });
  };

  this.refresh = function () {
    var
      cellId = this.getCurrentCellId();

      db.get(cellId + '-1', function (result) {
        if (result) {
          _this.highlight(cellId, result.cubeIds, 1);
        }
      });
      db.get(cellId + '-2', function (result) {
        if (result) {
          _this.highlight(cellId, result.cubeIds, 2);
        }
      });
      db.get(cellId + '-3', function (result) {
        if (result) {
          _this.highlight(cellId, result.cubeIds, 3);
        }
      });
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

    let results = [];
    let cell, cellId, index, v, row;
    db.openCursor(function (cursor) {
      if (cursor) {
        v = cursor.value;
        cell = v.cellId.split('-');
        cellId = cell[0];
        index = cell[1];
        if (results[cellId]) {
          results[cellId].cubes[index] = v.cubeIds.length;
          if (v.timestamp > results[cellId].timestamp) {
            results[cellId].timestamp = v.timestamp;
          }
        }
        else {
          results[cellId] = {
            cellId: cellId,
            cubes: {
              [index]: v.cubeIds.length
            },
            name: v.name,
            timestamp: v.timestamp,
            dataset: v.datasetId
          };
        }
        cursor.continue();
      }
      else {
          for (let id in results) {
            if (results.hasOwnProperty(id)) {
              row = results[id];
              html += `<tr
                data-cell-id="` + row.cellId + `"
                data-timestamp="` + row.timestamp + `"
                data-dataset-id="` + row.dataset + `"
              >
                <td>` +
                (row.cubes[1] ? (`<span style="color: ` + getColor(1) + `;">` + row.cubes[1]) + ` </span>` : '') +
                (row.cubes[2] ? (`<span style="color: ` + getColor(2) + `;">` + row.cubes[2]) + ` </span>` : '') +
                (row.cubes[3] ? (`<span style="color: ` + getColor(3) + `;">` + row.cubes[3]) + ` </span>` : '') +
                `</td>
                <td class="custom-highlighted-cell-name">` + row.name + `</td>
                <td>` + row.cellId + `</td>
                <td>` + (new Date(row.timestamp)).toLocaleString() + `</td>
                <td><button class="minimalButton">Remove</button></td>
              </tr>`;
            }
          }
        html += '</tbody></table>';

        K.gid('ewsCustomHighlightedCellsWrapper').innerHTML = html;
        $('#ewsCustomHighlightedCells').dialog('open');
      }
    });
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
        $(document).trigger('model-fetched-triggered');
      })
      .on('cell-info-ready', function (e, data) {
        $(document).trigger('cell-info-ready-triggered', data);
      })
      .on('cube-leave', function (e, data) {
        $(document).trigger('cube-leave-triggered', data);
      })
      .on('keyup.InspectorPanel.HotKeys', function (e) {
        e.type = 'hotkey-event-triggered';
        $(document).trigger(e);
      });
  `);


  // source: https://beta.eyewire.org/static/js/omni.js
  var controlset = ['highlight', 'unhighlight'];
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
    }
  };

  var _hotkeys = {};

  controlset.forEach(function (name) {
    var desc = BUTTON_DESCRIPTIONS[name];
    var basekey = desc.hotkey;

    if (desc.options.indexOf('cube') !== -1) {
      _hotkeys[basekey + basekey] = desc.fn.bind(_this);
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
    _this.currentColorIndex = this.value;
    K.ls.set('custom-highlight-index', this.value);
  });

  doc.on('cell-info-ready-triggered', function () {
    _this.highlightCell();
  });

  doc.on('cube-leave-triggered', function () {
    _this.refresh();
  });

  doc.on('model-fetched-triggered', function () {
    if (tomni.getTarget()) {
      $('.custom-highlight button').css({
        'color': '#00CC00',
        'border-color': '#00CC00',
        'cursor': 'pointer'
      })
      .addClass('active')
      .prop('disabled', false);

      $('.custom-unhighlight button').css({
        'color': '#FFA500',
        'border-color': '#FFA500',
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
      if ($(this).hasClass('active')) {
        // if (this.classList.contains('active')) {}
        _this.add();
      }
    })
    .on('click', '.custom-unhighlight button', function () {
      if ($(this).hasClass('active')) {
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
      if ($(this).hasClass('active')) {
        _this.showList();
      }
    });

  doc
    .on('click', '.custom-highlighted-cell-name', function () {
      tomni.setCell({id: this.nextElementSibling .innerHTML});
    })
    .on('click', '#ewsCustomHighlightedCellsWrapper button', function () {
      var
        cellId = this.parentNode.previousElementSibling.previousElementSibling.innerHTML,
        row = this.parentNode.parentNode;

      _this.removeCell(parseInt(cellId, 10));
      row.remove();
    });

    document.querySelector('.control.highlight button').disabled = false;
};
// end: CUSTOM HIGHLIGHT





if (LOCAL) {
  K.addCSSFile('http://127.0.0.1:8887/styles.css');
  K.addCSSFile('http://127.0.0.1:8887/spectrum.css');
}
else {
  K.addCSSFile('https://chrisraven.github.io/EyeWire-Custom-Highlight/styles.css?v=1');
  K.addCSSFile('https://chrisraven.github.io/EyeWire-Custom-Highlight/spectrum.css?v=1');
}


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

var db, highlight;


if (account.roles.scout || account.roles.scythe || account.roles.admin) {
  db = new Database();
  highlight = new CustomHighlight();
}



} // end: main()



})(); // end: wrapper
