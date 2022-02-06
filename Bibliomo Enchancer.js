// ==UserScript==
// @name         Bibliomo Edit Tool Enchancer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://bibliomo.ru/cgiopac/opacg/direct.exe
// @icon         https://www.google.com/s2/favicons?domain=bibliomo.ru
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const DEBUG = false;
    const STYLES = `
.bmoEditRowButton {
  margin-left: 15px;
}

/* The Modal (background) */
#bmoModalDialog {
  display: none; /* Hidden by default */
  position: fixed; /* Stay in place */
  z-index: 1; /* Sit on top */
  left: 0;
  top: 0;
  width: 100%; /* Full width */
  height: 100%; /* Full height */
  overflow: auto; /* Enable scroll if needed */
  background-color: rgb(0,0,0); /* Fallback color */
  background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
}

/* Modal Content/Box */
#bmoModalDialog-contentWrapper {
  background-color: #fefefe;
  margin: 15% auto; /* 15% from the top and centered */
  padding: 20px;
  border: 1px solid #888;
  width: 70%; /* Could be more or less, depending on screen size */
}

#bmoModalDialog-content input {
  width: 100%;
}

#bmoModalDialog-content td {
  width: 50%;
}

/* The Close Button */
#bmoModalDialogClose {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
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
    modalDialogCloseBtn.onclick = function() {modalDialog.style.display = "none";};
    window.onclick = function(event) {
        if (event.target == modalDialog) {
            modalDialog.style.display = "none";
        }
    }

    // Находим все строки и добавляем в них кнопку редактирования
    for(let item of document.getElementsByTagName("td")) {
        let editBtn = document.createElement("button");
        editBtn.className = "bmoEditRowButton white_button";
        editBtn.type = "button";
        editBtn.textContent = "Редактировать поля";
        for(let jitem of item.getElementsByClassName("promt")) jitem.append(editBtn);
    }

    if(DEBUG) jQuery(".promt>span").parent().prepend(DEBUGFIELDS);

    // Нажатие на кнопку редактирования
    for(let btn of document.getElementsByClassName("bmoEditRowButton")) {
        btn.onclick = function() {
            let textarea = btn.parentElement.parentElement.getElementsByTagName("textarea")[0];
            let text = textarea.value;
            let pattern = /\$(.)([^\$]*)/g;
            let filledFields = {}; // Объект со заполненными полями ($a -> значение)
            for(let item of text.matchAll(pattern)) filledFields[item[1]] = item[2];

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
        };
    }

    function drawEditWindow(allFields, filledFields, editButton) {
        modalDialogContent.innerHTML = ""; // очищаем окно
        let formElement = document.createElement("form");
        formElement.name = "bmoFields";

        // Создаем таблицу со всеми полями и значениями
        let table = document.createElement("table");
        for(let i = 0; i < allFields.length; i++)
            for(const [key, value] of Object.entries(allFields[i])) {
                let tr = document.createElement("tr");
                let fieldName = document.createElement("td");
                fieldName.textContent = value;
                let filedValueTd = document.createElement("td");
                let filedValue = document.createElement("input");
                filedValue.type = "text";
                filedValue.name = key;
                if(filledFields[key])filedValue.value = filledFields[key];
                filedValueTd.append(filedValue);
                tr.append(fieldName);
                tr.append(filedValueTd);
                table.append(tr);
            }
        formElement.append(table);
        let submitButton = document.createElement("button");
        submitButton.className = "white_button";
        submitButton.type = "button";
        submitButton.textContent = "Применить изменения";
        submitButton.onclick = function() {applyChanges(editButton)};
        formElement.append(submitButton);

        modalDialogContent.append(formElement);
        modalDialog.style.display = "block";
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