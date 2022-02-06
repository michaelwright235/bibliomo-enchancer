// ==UserScript==
// @name         Bibliomo Enchancer
// @namespace    https://github.com/michaelwright235/bibliomo-enchancer
// @homepage     https://github.com/michaelwright235/bibliomo-enchancer
// @version      0.4
// @description  Bibliomo Enchancer
// @author       Michael Wright
// @match        https://bibliomo.ru/cgiopac/opacg/direct.exe
// @icon         https://www.google.com/s2/favicons?domain=bibliomo.ru
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/michaelwright235/bibliomo-enchancer/main/Bibliomo%20Enchancer.js
// @updateURL    https://raw.githubusercontent.com/michaelwright235/bibliomo-enchancer/main/Bibliomo%20Enchancer.js
// ==/UserScript==

(function() {
    'use strict';

    const DEBUG = false;
    const STYLES = `
.bmoEditRowButton {
  margin-left: 15px;
}

/* Модальное окно (фон) */
#bmoModalDialog {
  display: none; /* Скрыто по-умолчанию, потом - flex */
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: fixed; /* Stay in place */
  z-index: 1; /* Sit on top */
  left: 0;
  top: 0;
  width: 100%; /* Full width */
  height: 100%; /* Full height */
  background-color: rgb(0,0,0);
  background-color: rgba(0,0,0,0.4);
}

/* Модальное окно */
#bmoModalDialog-contentWrapper {
  background-color: #fefefe;
  padding: 20px;
  border: 1px solid #888;
  width: 70%;
}

#bmoModalDialog-content {
  max-height: 80%;
  overflow: scroll;
}

#bmoModalDialog-content input {
  width: 100%;
}


#bmoModalDialog-content table {
  width: 100%;
}

#bmoModalDialog-content tr:nth-child(even) {
  background: #e3e3e3;
}

#bmoModalDialog-content td {
  width: 50%;
}

#bmoModalDialog-content form {
  text-align: center;
  margin: 0;
}
#bmoModalDialog-content button {
  margin-top: 20px;
}

/* Кнопка закрыть */
#bmoModalDialogClose {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
  padding-left: 10px;
}

#bmoModalDialogClose:hover,
#bmoModalDialogClose:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}
`;
    // Структура модального окна (отсюда не берется, здесь для примера)
    const MODALDIALOG = `
<div id="bmoModalDialog">
  <div id="bmoModalDialog-contentWrapper">
    <span id="bmoModalDialogClose">&times;</span>
    <div id="bmoModalDialog-content"></div>
  </div>
</div>
`;
    const DEBUGSTYLES = `
.isElastic {
  height:40px;
}
body, html {
  overflow: visible;
}
`;
    const DEBUGFIELDS = '<span id="promt_0101"> <a href="#" onclick="copy_to_memo(&quot;$a&quot;,&quot;010&quot;,&quot;1&quot;)" onmouseover="show_subfield_promt(event,\'$a Номер (ISBN)\')" onmouseout="hide_subfield_promt()">$a</a> <a href="#" onclick="copy_to_memo(&quot;$b&quot;,&quot;010&quot;,&quot;1&quot;)" onmouseover="show_subfield_promt(event,\'$b Уточнения\')" onmouseout="hide_subfield_promt()">$b</a>';

    /******/

    // Так как страница может быть загружена с разными запросами, фильтруем по названию
    if(document.getElementsByTagName("title")[0].innerHTML == 'Редактирование записи') {
        console.log('Bibliomo script loaded');
    } else return;

    // Добавляем стили
    let styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.appendChild(document.createTextNode(STYLES));
    if(DEBUG) styleElement.appendChild(document.createTextNode(DEBUGSTYLES));
    document.head.append(styleElement);

    // Настройка модального окна
    let div_bmoModalDialog = document.createElement("div");
    div_bmoModalDialog.id = "bmoModalDialog";
    let div_bmoModalDialog_contentWrapper = document.createElement("div");
    div_bmoModalDialog_contentWrapper.id = "bmoModalDialog-contentWrapper";
    let span_bmoModalDialogClose = document.createElement("span");
    span_bmoModalDialogClose.id = "bmoModalDialogClose";
    span_bmoModalDialogClose.textContent = "×";
    let div_bmoModalDialog_content = document.createElement("div");
    div_bmoModalDialog_content.id = "bmoModalDialog-content";

    div_bmoModalDialog_contentWrapper.append(span_bmoModalDialogClose, div_bmoModalDialog_content);
    div_bmoModalDialog.append(div_bmoModalDialog_contentWrapper);
    document.body.append(div_bmoModalDialog);

    let modalDialog = document.getElementById("bmoModalDialog");
    let modalDialogContent = document.getElementById("bmoModalDialog-content");
    let modalDialogCloseBtn = document.getElementById("bmoModalDialogClose");
    modalDialogCloseBtn.onclick = () => {modalDialog.style.display = "none"};
    window.onclick = function(event) {
        if (event.target == modalDialog) {
            modalDialog.style.display = "none";
        }
    }

    if(DEBUG) jQuery(".promt>span").parent().prepend(DEBUGFIELDS);

    // Находим все строки и добавляем в них кнопку редактирования
    for(let item of document.getElementsByTagName("td")) {
        if(item.getElementsByClassName("promt").length != 0) {
            item.getElementsByClassName("promt")[0].append(initEditButton());
        }
    }

    // Добавляем кнопку в новые строки (при дублировании/добавлении строки)
    let mutationObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if(mutation.target.id.indexOf("td_data_") !== -1 &&
               mutation.target.getElementsByClassName("bmoEditRowButton").length == 0) {
                mutation.target.getElementsByClassName("promt")[0].append(initEditButton());
            }
        });
    });
    mutationObserver.observe(document.getElementById("bottom_data"), {
        characterData: true,
        childList: true,
        subtree: true
    });

    // Создание кнопки редактирования подполей
    function initEditButton() {
        let btn = document.createElement("button");
        btn.className = "bmoEditRowButton white_button";
        btn.type = "button";
        btn.textContent = "Редактировать подполя";
        btn.onclick = () => editButtonClick(btn);
        return btn;
    }

    // Действие при нажатии кнопки редактирования подполей
    function editButtonClick(btn) {
        let textarea = btn.parentElement.parentElement.getElementsByTagName("textarea")[0];
        let text = textarea.value;
        let pattern = /\$(.)([^\$]*)/g;
        let filledFields = {}; // Объект со заполненными полями ($a -> значение)
        for(let item of text.matchAll(pattern)) {
            if(!filledFields[item[1]]) {
                filledFields[item[1]] = [item[2]];
            }
            else {
                filledFields[item[1]].push(item[2]);
            }
        }

        // Находим все доступные поля из .promt
        let promt = btn.parentElement.getElementsByTagName("a");
        let allFields = []; // Объект со всеми возможными полями ($a -> описание)
        for(let item of promt) {
            let name = item.textContent.substring(1);
            let desc = item.getAttribute("onmouseover");
            let pattern = /'(.*)'/;
            desc = desc.match(pattern)[1];

            let f = {};
            f[name] = desc;
            allFields.push(f);
        }

        drawEditWindow(allFields, filledFields, btn);
    }

    function drawEditWindow(allFields, filledFields, editButton) {
        modalDialogContent.innerHTML = ""; // очищаем окно
        let formElement = document.createElement("form");
        formElement.name = "bmoFields";
        formElement.autocomplete = "off";

        // Создаем таблицу со всеми полями и значениями
        let table = document.createElement("table");
        for(let i = 0; i < allFields.length; i++) {
            for(const [key, value] of Object.entries(allFields[i])) {
                let c = 1;
                if(filledFields[key] && filledFields[key].length != 0) {
                    c = filledFields[key].length;
                }

                for(let j = 0; j<c; j++) {
                    let tr = document.createElement("tr");
                    let fieldName = document.createElement("td");
                    fieldName.textContent = value;
                    let filedValueTd = document.createElement("td");
                    let filedValue = document.createElement("input");
                    filedValue.type = "text";
                    filedValue.name = key;
                    if(filledFields[key] && filledFields[key].length != 0) {
                        filedValue.value = filledFields[key][0];
                        filledFields[key].shift();
                    }
                    filedValueTd.append(filedValue);
                    tr.append(fieldName);
                    tr.append(filedValueTd);
                    table.append(tr);
                }
            }
        }
        formElement.append(table);
        let submitButton = document.createElement("button");
        submitButton.className = "white_button";
        submitButton.type = "button";
        submitButton.textContent = "Применить изменения";
        submitButton.onclick = () => applyChanges(editButton);
        formElement.append(submitButton);

        modalDialogContent.append(formElement);
        modalDialog.style.display = "flex";
    }

    function applyChanges(editButton) {
        let formData = new FormData(document.forms.bmoFields);
        let formedString = "";
        for(let item of formData.entries()) {
            if(item[1].length != 0) formedString += "$" + item[0] + item[1];
        }

        editButton.parentElement.parentElement.getElementsByTagName("textarea")[0].value = formedString;
        modalDialog.style.display = "none";
    }

})();