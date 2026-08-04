import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ============================================================
   ТАКТИЧЕСКАЯ ДОСКА  —  8×8 / 9×9 / 10×10
   Система координат поля: x 0..100 (слева направо),
   y 0..140 (0 = ворота соперника, 140 = наши ворота).
   Атакуем СНИЗУ ВВЕРХ.
   ============================================================ */

const T = {
  ink: "#0A101E",
  panel: "#121B2E",
  panelHi: "#1A2540",
  edge: "#26324F",
  text: "#E8EDF7",
  dim: "#8B99B5",
  dimmer: "#5C6A87",
  us: "#4CC9F0",
  usDeep: "#1B7FA8",
  gk: "#B8E986",
  opp: "#FF5C77",
  ball: "#FFFFFF",
  pass: "#4CC9F0",
  cross: "#9D8DF1",
  dribble: "#3DDC97",
  run: "#FFB300",
  move: "#FFB300",
  oppMove: "#FF5C77",
  shot: "#FF3B5C",
  option: "#C08CFF",
  zone: "#D8FF5E",
};

/* ---------------------- ФОРМАЦИИ ---------------------- */

const FORMATIONS = {
  "8x8": {
    label: "8 × 8",
    scheme: "4 – 1 – 2",
    defScheme: "4 – 1 – 2",
    idea: "Самая быстрая схема. Компактный блок, высокий прессинг, мяч доставляется нападающим в 2–3 передачи.",
    us: [
      ["gk", "ВР", 50, 130],
      ["lb", "ЛЗ", 16, 104],
      ["lcb", "ЛЦЗ", 38, 112],
      ["rcb", "ПЦЗ", 62, 112],
      ["rb", "ПЗ", 84, 104],
      ["cm", "ЦП", 50, 84],
      ["st1", "ФРВ1", 42, 56],
      ["st2", "ФРВ2", 63, 48],
    ],
    opp: [
      ["o_gk", "ВР", 50, 10],
      ["o_d1", "З", 16, 36],
      ["o_d2", "ЦЗ", 38, 28],
      ["o_d3", "ЦЗ", 62, 28],
      ["o_d4", "З", 84, 36],
      ["o_m1", "ЦП", 50, 60],
      ["o_f1", "ФРВ", 42, 90],
      ["o_f2", "ФРВ", 62, 96],
    ],
  },
  "9x9": {
    label: "9 × 9",
    scheme: "4 – 2 – 2",
    defScheme: "4 – 2 – 2",
    idea: "Контроль центра двумя опорными. Пространство создаётся движением ФРВ1, добивается скоростью ФРВ2. Крайние защитники активно подключаются.",
    us: [
      ["gk", "ВР", 50, 130],
      ["lb", "ЛЗ", 15, 104],
      ["lcb", "ЛЦЗ", 38, 112],
      ["rcb", "ПЦЗ", 62, 112],
      ["rb", "ПЗ", 85, 104],
      ["cm1", "ЦП1", 35, 86],
      ["cm2", "ЦП2", 64, 88],
      ["st1", "ФРВ1", 44, 54],
      ["st2", "ФРВ2", 63, 46],
    ],
    opp: [
      ["o_gk", "ВР", 50, 10],
      ["o_d1", "З", 15, 36],
      ["o_d2", "ЦЗ", 38, 28],
      ["o_d3", "ЦЗ", 62, 28],
      ["o_d4", "З", 85, 36],
      ["o_m1", "ЦП", 36, 62],
      ["o_m2", "ЦП", 64, 62],
      ["o_f1", "ФРВ", 42, 92],
      ["o_f2", "ФРВ", 60, 98],
    ],
  },
  "10x10": {
    label: "10 × 10",
    scheme: "4 – 3 – 2",
    defScheme: "4 – 3 – 2",
    idea: "Больше контроля мяча и комбинаций. Третий полузащитник (АП) — главный игрок между линиями и адресат передач назад под удар.",
    us: [
      ["gk", "ВР", 50, 130],
      ["lb", "ЛЗ", 13, 102],
      ["lcb", "ЛЦЗ", 38, 112],
      ["rcb", "ПЦЗ", 62, 112],
      ["rb", "ПЗ", 87, 102],
      ["cm1", "ЦП1", 30, 88],
      ["cm2", "ЦП2", 68, 88],
      ["am", "АП", 50, 68],
      ["st1", "ЛФРВ", 34, 44],
      ["st2", "ПФРВ", 66, 42],
    ],
    opp: [
      ["o_gk", "ВР", 50, 10],
      ["o_d1", "З", 13, 36],
      ["o_d2", "ЦЗ", 38, 28],
      ["o_d3", "ЦЗ", 62, 28],
      ["o_d4", "З", 87, 36],
      ["o_m1", "ЦП", 31, 54],
      ["o_m2", "ЦП", 69, 54],
      ["o_am", "АП", 50, 78],
      ["o_f1", "ФРВ", 34, 100],
      ["o_f2", "ФРВ", 66, 98],
    ],
  },
};

/* ---------------------- ТАКТИКИ ---------------------- */
/* шаг: { v: глагол-метка, t: заголовок, d: описание,
          ball: id|[x,y], us:{}, opp:{}, lines:[], zones:[] } */

const TACTICS = {
  "8x8": [
    {
      id: "a1",
      kind: "Атака",
      name: "Через центр",
      sub: "ЛЗ → ЦП → ФРВ1 → рывок ФРВ2",
      steps: [
        {
          v: "Старт",
          t: "Исходная расстановка",
          d: "Мяч у левого защитника. Соперник в среднем блоке: два форварда перекрывают центр, четвёрка защитников держит линию.",
          ball: "lb",
        },
        {
          v: "Пас",
          t: "ЛЗ → ЦП",
          d: "Полузащитник открывается в полупространство и принимает мяч вполоборота — лицом к воротам, а не спиной.",
          ball: "cm",
          us: { cm: [44, 80] },
          opp: { o_f1: [38, 78] },
          lines: [{ from: "lb", to: "cm", type: "pass" }],
        },
        {
          v: "Отход",
          t: "ФРВ1 отходит — защитник выходит за ним",
          d: "Ключевой момент. ФРВ1 уходит в зону между линиями. Центральный защитник соперника обязан выйти следом — и за его спиной открывается коридор.",
          us: { st1: [45, 68] },
          opp: { o_d2: [45, 54] },
          lines: [
            { from: [42, 56], to: [45, 68], type: "move" },
            { from: [38, 28], to: [45, 54], type: "oppMove" },
          ],
          zones: [{ x: 44, y: 32, rx: 16, ry: 11, label: "Зона за спиной ЦЗ" }],
        },
        {
          v: "В ноги",
          t: "ЦП → ФРВ1 + рывок ФРВ2",
          d: "Передача в ноги отошедшему форварду. Одновременно ФРВ2 стартует по диагонали в освободившуюся зону — это должно происходить в один момент с касанием мяча.",
          ball: "st1",
          us: { st2: [58, 27] },
          opp: { o_d3: [66, 33] },
          lines: [
            { from: "cm", to: "st1", type: "pass" },
            { from: [63, 48], to: [58, 27], type: "run", label: "рывок" },
          ],
          zones: [{ x: 44, y: 32, rx: 16, ry: 11, label: "Зона открыта" }],
        },
        {
          v: "Вразрез",
          t: "Скидка в одно касание",
          d: "ФРВ1 не разворачивается — отдаёт первым касанием вразрез. Второй защитник уже не успевает сместиться.",
          ball: "st2",
          us: { st2: [55, 21] },
          lines: [{ from: "st1", to: "st2", type: "pass" }],
        },
        {
          v: "Удар",
          t: "Выход один на один",
          d: "ФРВ2 остаётся один против вратаря. Бить в дальний угол низом.",
          ball: [50, 3],
          us: { st2: [53, 15] },
          opp: { o_gk: [50, 15] },
          lines: [{ from: [53, 15], to: [50, 5], type: "shot" }],
        },
      ],
    },
    {
      id: "a2",
      kind: "Атака",
      name: "Через правый фланг",
      sub: "ЦП → ПЗ → навес / прострел / дриблинг",
      steps: [
        {
          v: "Старт",
          t: "Мяч у ЦП",
          d: "Соперник стянут в центр — правый фланг остаётся свободным.",
          ball: "cm",
        },
        {
          v: "Перевод",
          t: "ЦП → ПЗ",
          d: "Правый защитник уже начал подключение и получает мяч на ходу.",
          ball: "rb",
          us: { rb: [87, 90] },
          lines: [{ from: "cm", to: "rb", type: "pass" }],
        },
        {
          v: "Проход",
          t: "ПЗ проходит вперёд",
          d: "Крайний защитник соперника вынужден выдвинуться на мяч — линия обороны растягивается.",
          ball: "rb",
          us: { rb: [88, 60], st1: [46, 32], st2: [62, 26] },
          opp: { o_d4: [86, 50] },
          lines: [
            { from: [87, 90], to: [88, 60], type: "dribble" },
            { from: [84, 36], to: [86, 50], type: "oppMove" },
          ],
        },
        {
          v: "Выбор",
          t: "Три варианта решения",
          d: "Читаем ситуацию: открыт навес — навешиваем; открыт прострел — простреливаем; есть пространство — идём в дриблинг.",
          lines: [
            { from: "rb", to: [58, 16], type: "option", label: "навес" },
            { from: "rb", to: [46, 10], type: "option", label: "прострел" },
            { from: "rb", to: [74, 44], type: "option", label: "дриблинг" },
          ],
        },
        {
          v: "Дриблинг",
          t: "Уход внутрь",
          d: "ПЗ смещается в штрафную по диагонали. Защитник соперника разворачивается, ближний ЦЗ вынужден идти на мяч.",
          ball: "rb",
          us: { rb: [74, 44], st1: [40, 24], st2: [63, 20] },
          opp: { o_d4: [80, 47], o_d3: [58, 27] },
          lines: [{ from: [88, 60], to: [74, 44], type: "dribble" }],
          zones: [{ x: 45, y: 20, rx: 13, ry: 8, label: "Освобождённая зона" }],
        },
        {
          v: "Прострел",
          t: "Передача под набегание",
          d: "ФРВ2 держит ближнюю штангу и уводит защитника, ФРВ1 врывается на дальнюю — туда и идёт передача.",
          ball: "st1",
          us: { st1: [44, 17] },
          lines: [{ from: "rb", to: "st1", type: "cross" }],
        },
        {
          v: "Удар",
          t: "Замыкание",
          d: "Удар в касание — по низу, без обработки.",
          ball: [50, 3],
          lines: [{ from: "st1", to: [50, 5], type: "shot" }],
        },
      ],
    },
    {
      id: "d1",
      kind: "Оборона",
      name: "Высокий прессинг 4–1–2",
      sub: "Перекрыть центр — увести к боковой — отобрать",
      steps: [
        {
          v: "Блок",
          t: "Форма 4–1–2",
          d: "Мяч у центрального защитника соперника. Наша команда поднялась: два форварда впереди, ЦП под ними, четвёрка защитников на одной линии.",
          ball: "o_d2",
          us: {
            gk: [50, 108],
            lb: [18, 84],
            lcb: [40, 90],
            rcb: [60, 90],
            rb: [82, 84],
            cm: [50, 64],
            st1: [42, 42],
            st2: [58, 40],
          },
        },
        {
          v: "Тень",
          t: "ФРВ перекрывают центр",
          d: "Форварды располагаются так, чтобы линия передачи в центр была закрыта корпусом. Пас внутрь невозможен — сопернику остаётся только фланг.",
          zones: [{ x: 50, y: 48, rx: 18, ry: 13, label: "Центр перекрыт" }],
          lines: [{ from: "o_d2", to: "o_m1", type: "blocked", label: "закрыто" }],
        },
        {
          v: "Триггер",
          t: "Пас на фланг = сигнал",
          d: "Как только мяч уходит к боковой — включаемся. ЦП встречает принимающего, ближний защитник выдвигается, вся команда смещается.",
          ball: "o_d1",
          us: { cm: [34, 58], lb: [20, 62], st1: [30, 40], st2: [48, 40] },
          opp: { o_m1: [40, 60] },
          lines: [
            { from: "o_d2", to: "o_d1", type: "oppPass" },
            { from: [50, 64], to: [34, 58], type: "move" },
          ],
        },
        {
          v: "Ловушка",
          t: "Сужение и компактность",
          d: "Дальний ПЗ сужает внутрь, центральные защитники смещаются к мячу. Расстояние между линиями — минимальное. Соперник заперт у боковой.",
          us: { lcb: [32, 86], rcb: [54, 88], rb: [70, 84] },
          zones: [{ x: 22, y: 54, rx: 17, ry: 15, label: "Ловушка у боковой" }],
        },
        {
          v: "Отбор",
          t: "Отбор и мгновенный выход",
          d: "ЛЗ и ЦП отбирают вдвоём. Сразу пас на ФРВ1 — соперник ещё не перестроился. Важно: ЛЗ и ПЗ не уходили вперёд одновременно, поэтому сзади всегда трое.",
          ball: "st1",
          us: { st1: [28, 38] },
          lines: [{ from: "cm", to: "st1", type: "pass" }],
        },
      ],
    },
  ],

  "9x9": [
    {
      id: "a1",
      kind: "Атака",
      name: "Основная атака через центр",
      sub: "Смена угла через второго опорного",
      steps: [
        {
          v: "Старт",
          t: "Исходная расстановка",
          d: "Мяч у ЛЗ. Два опорных дают ширину паса и контроль центра.",
          ball: "lb",
        },
        {
          v: "Пас",
          t: "ЛЗ → ЦП1",
          d: "Первый опорный опускается под передачу и принимает открыто.",
          ball: "cm1",
          us: { cm1: [32, 82] },
          lines: [{ from: "lb", to: "cm1", type: "pass" }],
        },
        {
          v: "Отход",
          t: "ФРВ1 отходит, ЦЗ выходит",
          d: "ФРВ1 уходит между линиями. Центральный защитник идёт за ним — линия обороны рвётся.",
          us: { st1: [46, 66] },
          opp: { o_d2: [46, 52] },
          lines: [
            { from: [44, 54], to: [46, 66], type: "move" },
            { from: [38, 28], to: [46, 52], type: "oppMove" },
          ],
          zones: [{ x: 44, y: 30, rx: 15, ry: 11, label: "Разрыв в линии" }],
        },
        {
          v: "Смена угла",
          t: "ЦП1 → ЦП2",
          d: "Перевод на второго опорного меняет угол передачи. Защитники соперника вынуждены развернуть корпус — на полсекунды они слепы.",
          ball: "cm2",
          us: { cm2: [61, 78] },
          opp: { o_m1: [44, 68], o_m2: [60, 66] },
          lines: [{ from: "cm1", to: "cm2", type: "pass" }],
          zones: [{ x: 44, y: 30, rx: 15, ry: 11, label: "Разрыв в линии" }],
        },
        {
          v: "Рывок",
          t: "ФРВ2 забегает за спину",
          d: "Забегание начинается ровно в момент приёма мяча ЦП2 — не раньше, иначе офсайд, и не позже, иначе зона закроется.",
          us: { st2: [60, 26] },
          opp: { o_d3: [66, 33] },
          lines: [{ from: [63, 46], to: [60, 26], type: "run", label: "рывок" }],
        },
        {
          v: "Вразрез",
          t: "ЦП2 → ФРВ2",
          d: "Передача вразрез на ход, в свободную зону, а не в ноги.",
          ball: "st2",
          us: { st2: [58, 19] },
          lines: [{ from: "cm2", to: "st2", type: "pass" }],
        },
        {
          v: "Прострел",
          t: "Второй темп",
          d: "ФРВ2 не бьёт из острого угла — простреливает назад на ФРВ1, который идёт вторым темпом на угол вратарской.",
          ball: "st1",
          us: { st1: [45, 18] },
          lines: [{ from: "st2", to: "st1", type: "cross" }],
        },
        {
          v: "Удар",
          t: "Завершение",
          d: "Удар в одно касание с линии вратарской.",
          ball: [50, 3],
          lines: [{ from: "st1", to: [50, 5], type: "shot" }],
        },
      ],
    },
    {
      id: "a2",
      kind: "Атака",
      name: "Правая атака",
      sub: "ЦП1 → ПЗ → фланг, ЦП2 страхует",
      steps: [
        {
          v: "Старт",
          t: "Мяч у ЦП1",
          d: "Разыгрываем с левой стороны, чтобы стянуть блок соперника.",
          ball: "cm1",
        },
        {
          v: "Перевод",
          t: "ЦП1 → ПЗ",
          d: "Диагональ на противоположный фланг — самое быстрое средство против компактного блока.",
          ball: "rb",
          us: { rb: [87, 90] },
          lines: [{ from: "cm1", to: "rb", type: "pass" }],
        },
        {
          v: "Проход",
          t: "ПЗ вперёд, ЦП2 страхует",
          d: "Пока ПЗ идёт вперёд, ЦП2 занимает его зону. Это страховка от контратаки — правая бровка не остаётся пустой.",
          ball: "rb",
          us: { rb: [88, 60], cm2: [70, 82], st1: [44, 30], st2: [62, 24] },
          opp: { o_d4: [86, 48] },
          lines: [
            { from: [87, 90], to: [88, 60], type: "dribble" },
            { from: [64, 88], to: [70, 82], type: "move", label: "страховка" },
          ],
        },
        {
          v: "Выбор",
          t: "Четыре сценария",
          d: "Навес, прострел, дриблинг с ударом или дриблинг с передачей — решение принимает игрок с мячом по положению защитника.",
          lines: [
            { from: "rb", to: [58, 15], type: "option", label: "навес" },
            { from: "rb", to: [45, 9], type: "option", label: "прострел" },
            { from: "rb", to: [72, 42], type: "option", label: "дриблинг" },
          ],
        },
        {
          v: "Дриблинг",
          t: "Уход внутрь",
          d: "ПЗ смещается на угол штрафной, ФРВ разводят защитников по штангам.",
          ball: "rb",
          us: { rb: [72, 42], st1: [42, 22], st2: [60, 18] },
          opp: { o_d4: [78, 46], o_d3: [56, 24] },
          lines: [{ from: [88, 60], to: [72, 42], type: "dribble" }],
          zones: [{ x: 50, y: 24, rx: 12, ry: 8, label: "Зона под передачу" }],
        },
        {
          v: "Пас",
          t: "Передача на ФРВ2",
          d: "Низом, в противоход защитнику.",
          ball: "st2",
          lines: [{ from: "rb", to: "st2", type: "pass" }],
        },
        {
          v: "Удар",
          t: "Завершение",
          d: "Удар первым касанием.",
          ball: [50, 3],
          lines: [{ from: "st2", to: [50, 5], type: "shot" }],
        },
      ],
    },
    {
      id: "d1",
      kind: "Оборона",
      name: "Оборона 4–2–2",
      sub: "ЦП1 прессингует, ЦП2 страхует",
      steps: [
        {
          v: "Блок",
          t: "Форма 4–2–2",
          d: "Мяч у ЦЗ соперника. Два форварда впереди, два опорных — один прессингует, второй всегда сзади него.",
          ball: "o_d2",
          us: {
            gk: [50, 110],
            lb: [18, 86],
            lcb: [40, 92],
            rcb: [60, 92],
            rb: [82, 86],
            cm1: [36, 64],
            cm2: [62, 66],
            st1: [42, 42],
            st2: [58, 40],
          },
        },
        {
          v: "Тень",
          t: "ФРВ закрывают центр",
          d: "Передача в центр перекрыта корпусом форвардов. Соперник обязан играть на фланг.",
          zones: [{ x: 50, y: 48, rx: 18, ry: 13, label: "Центр перекрыт" }],
          lines: [
            { from: "o_d2", to: "o_m1", type: "blocked", label: "закрыто" },
            { from: "o_d3", to: "o_m2", type: "blocked", label: "закрыто" },
          ],
        },
        {
          v: "Триггер",
          t: "Мяч на фланг → прессинг",
          d: "Ближний опорный (здесь ЦП2) выдвигается на принимающего. Дальний опорный ЦП1 смещается в центр за его спину — страхует зону.",
          ball: "o_d4",
          us: { cm2: [72, 56], cm1: [50, 70], st2: [68, 40], st1: [52, 44] },
          lines: [
            { from: "o_d2", to: "o_d4", type: "oppPass" },
            { from: [62, 66], to: [72, 56], type: "move", label: "прессинг" },
            { from: [36, 64], to: [50, 70], type: "move", label: "страховка" },
          ],
        },
        {
          v: "Сужение",
          t: "Компактность линии",
          d: "Четвёрка защитников смещается к мячу и сохраняет дистанцию 6–8 метров между собой. Дальний ЛЗ сужает внутрь.",
          us: { lb: [32, 84], lcb: [48, 90], rcb: [66, 88], rb: [84, 74] },
          zones: [{ x: 78, y: 58, rx: 17, ry: 15, label: "Ловушка у боковой" }],
        },
        {
          v: "Отбор",
          t: "Отбор и выход",
          d: "Отбор в ловушке — сразу вертикальная передача на ФРВ2, пока соперник открыт.",
          ball: "st2",
          us: { st2: [66, 36] },
          lines: [{ from: "cm2", to: "st2", type: "pass" }],
        },
      ],
    },
  ],

  "10x10": [
    {
      id: "a1",
      kind: "Атака",
      name: "Центральная атака через АП",
      sub: "ЛЗ → ЦП1 → АП → скидка → вразрез",
      steps: [
        {
          v: "Старт",
          t: "Исходная расстановка",
          d: "Мяч у ЛЗ. Три полузащитника дают треугольники — соперник не может закрыть все линии передач.",
          ball: "lb",
        },
        {
          v: "Пас",
          t: "ЛЗ → ЦП1",
          d: "Опорный открывается под углом, а не по прямой линии от мяча.",
          ball: "cm1",
          us: { cm1: [28, 84] },
          lines: [{ from: "lb", to: "cm1", type: "pass" }],
        },
        {
          v: "Между линий",
          t: "ЦП1 → АП",
          d: "АП находит карман между линиями соперника. Полузащитник соперника опаздывает на полшага.",
          ball: "am",
          us: { am: [47, 64] },
          opp: { o_m2: [57, 60], o_am: [50, 82] },
          lines: [{ from: "cm1", to: "am", type: "pass" }],
        },
        {
          v: "Отход",
          t: "ЛФРВ отходит, ЦЗ выходит",
          d: "Форвард опускается навстречу мячу и стягивает на себя центрального защитника. За его спиной открывается коридор.",
          us: { st1: [42, 52] },
          opp: { o_d2: [42, 40] },
          lines: [
            { from: [34, 44], to: [42, 52], type: "move" },
            { from: [38, 28], to: [42, 40], type: "oppMove" },
          ],
          zones: [{ x: 45, y: 24, rx: 15, ry: 10, label: "Зона за спиной ЦЗ" }],
        },
        {
          v: "В ноги",
          t: "АП → ЛФРВ",
          d: "Передача в ноги. Форвард играет спиной к воротам и работает как стенка.",
          ball: "st1",
          lines: [{ from: "am", to: "st1", type: "pass" }],
          zones: [{ x: 45, y: 24, rx: 15, ry: 10, label: "Зона открыта" }],
        },
        {
          v: "Скидка",
          t: "Скидка назад + рывок ПФРВ",
          d: "ЛФРВ возвращает мяч на АП в одно касание. В этот же момент ПФРВ стартует за спину второму защитнику.",
          ball: "am",
          us: { st2: [58, 22] },
          opp: { o_d3: [64, 32] },
          lines: [
            { from: "st1", to: "am", type: "pass" },
            { from: [66, 42], to: [58, 22], type: "run", label: "рывок" },
          ],
        },
        {
          v: "Вразрез",
          t: "АП отдаёт вразрез",
          d: "АП принимает мяч уже развёрнутым — ему достаточно одного касания, чтобы отдать в коридор.",
          ball: "st2",
          us: { st2: [55, 17] },
          lines: [{ from: "am", to: "st2", type: "pass" }],
        },
        {
          v: "Удар",
          t: "Завершение",
          d: "Удар из штрафной.",
          ball: [50, 3],
          opp: { o_gk: [50, 15] },
          lines: [{ from: "st2", to: [50, 5], type: "shot" }],
        },
      ],
    },
    {
      id: "a2",
      kind: "Атака",
      name: "Фланговая атака с подключением АП",
      sub: "ПЗ по флангу → передача назад под удар",
      steps: [
        {
          v: "Старт",
          t: "Мяч у ЦП2",
          d: "Разыгрываем правую сторону.",
          ball: "cm2",
        },
        {
          v: "Пас",
          t: "ЦП2 → ПЗ",
          d: "ПЗ получает мяч на фланге с запасом пространства перед собой.",
          ball: "rb",
          us: { rb: [88, 86] },
          lines: [{ from: "cm2", to: "rb", type: "pass" }],
        },
        {
          v: "Проход",
          t: "ПЗ идёт вперёд, АП подключается",
          d: "Пока ПЗ работает у боковой, АП смещается на угол штрафной — открывается под передачу назад.",
          ball: "rb",
          us: { rb: [89, 58], am: [62, 40], st1: [40, 22], st2: [58, 18] },
          opp: { o_d4: [86, 48], o_d2: [42, 20], o_d3: [56, 18] },
          lines: [
            { from: [88, 86], to: [89, 58], type: "dribble" },
            { from: [50, 68], to: [62, 40], type: "move", label: "подключение" },
          ],
        },
        {
          v: "Выбор",
          t: "Четыре варианта",
          d: "Навес, прострел, передача назад под удар АП или дриблинг. Оба ФРВ уже увели защитников на штанги — самая свободная точка находится перед штрафной.",
          lines: [
            { from: "rb", to: [56, 12], type: "option", label: "навес" },
            { from: "rb", to: [44, 8], type: "option", label: "прострел" },
            { from: "rb", to: "am", type: "option", label: "назад под удар" },
          ],
          zones: [{ x: 62, y: 40, rx: 13, ry: 9, label: "Зона под удар свободна" }],
        },
        {
          v: "Назад",
          t: "Передача назад на АП",
          d: "Защитники смотрят на мяч и на форвардов — АП остаётся без опеки на линии штрафной.",
          ball: "am",
          lines: [{ from: "rb", to: "am", type: "pass" }],
          zones: [{ x: 62, y: 40, rx: 13, ry: 9, label: "Никто не держит" }],
        },
        {
          v: "Удар",
          t: "Удар АП с угла штрафной",
          d: "Удар с подработки в дальний угол. ФРВ на ближней штанге готов к добиванию и мешает обзору вратаря.",
          ball: [50, 3],
          lines: [{ from: "am", to: [50, 5], type: "shot" }],
        },
      ],
    },
    {
      id: "a3",
      kind: "Атака",
      name: "Левый фланг: скорость без дриблинга",
      sub: "Стенка с ЦП1 и прострел вдоль ворот",
      steps: [
        {
          v: "Старт",
          t: "Мяч у ЛЦЗ",
          d: "Быстрый ЛЗ уже смотрит на свободную бровку.",
          ball: "lcb",
        },
        {
          v: "Пас",
          t: "ЛЦЗ → ЛЗ",
          d: "ЛЗ получает мяч лицом к полю, не спиной к боковой.",
          ball: "lb",
          us: { lb: [12, 92] },
          lines: [{ from: "lcb", to: "lb", type: "pass" }],
        },
        {
          v: "Стенка",
          t: "Короткий пас и забегание",
          d: "ЛЗ не идёт в затяжной дриблинг — отдаёт короткий на ЦП1 и сразу стартует по флангу. Скорость важнее обводки.",
          ball: "cm1",
          us: { cm1: [26, 78], lb: [16, 58] },
          lines: [
            { from: [12, 92], to: "cm1", type: "pass" },
            { from: [12, 92], to: [16, 58], type: "run", label: "забегание" },
          ],
        },
        {
          v: "На ход",
          t: "ЦП1 возвращает на ход",
          d: "Передача не в ноги, а в свободную зону перед ЛЗ — защитник соперника развёрнут и проигрывает старт.",
          ball: "lb",
          us: { lb: [16, 38] },
          opp: { o_d1: [22, 34] },
          lines: [{ from: "cm1", to: "lb", type: "pass" }],
          zones: [{ x: 16, y: 34, rx: 11, ry: 12, label: "Свободная бровка" }],
        },
        {
          v: "Прострел",
          t: "Прострел вдоль ворот",
          d: "Низом, по линии вратарской, между вратарём и защитниками. ПФРВ замыкает на дальней штанге.",
          ball: "st2",
          us: { lb: [17, 24], st1: [40, 15], st2: [60, 13] },
          opp: { o_d2: [37, 15], o_d3: [53, 13] },
          lines: [{ from: [17, 24], to: "st2", type: "cross" }],
        },
        {
          v: "Удар",
          t: "Замыкание на дальней",
          d: "Достаточно подставить ногу.",
          ball: [50, 3],
          lines: [{ from: "st2", to: [50, 5], type: "shot" }],
        },
      ],
    },
    {
      id: "a4",
      kind: "Контратака",
      name: "Контратака после отбора",
      sub: "ЦЗ → ЦП1 → АП → ФРВ → за спину",
      steps: [
        {
          v: "Оборона",
          t: "Низкий блок, соперник давит",
          d: "Соперник поднял пятерых игроков в нашу треть. Мы обороняемся компактно и ждём момент отбора.",
          ball: "o_am",
          us: {
            lb: [16, 110],
            lcb: [40, 116],
            rcb: [60, 116],
            rb: [84, 110],
            cm1: [34, 96],
            cm2: [64, 96],
            am: [50, 84],
            st1: [38, 66],
            st2: [62, 64],
          },
          opp: {
            o_d1: [16, 58],
            o_d2: [40, 52],
            o_d3: [60, 52],
            o_d4: [84, 58],
            o_m1: [34, 76],
            o_m2: [66, 76],
            o_am: [50, 90],
            o_f1: [40, 104],
            o_f2: [60, 102],
          },
        },
        {
          v: "Отбор",
          t: "ЛЦЗ выигрывает единоборство",
          d: "Момент отбора — старт контратаки. За спиной соперника огромное пространство: их защитники стоят у центральной линии.",
          ball: "lcb",
          zones: [{ x: 50, y: 34, rx: 26, ry: 15, label: "Свободное пространство" }],
        },
        {
          v: "Пас",
          t: "ЦЗ → ЦП1",
          d: "Первый пас — обязательно вперёд и в свободную зону, без поперечных передач.",
          ball: "cm1",
          us: { cm1: [36, 88] },
          lines: [{ from: "lcb", to: "cm1", type: "pass" }],
          zones: [{ x: 50, y: 34, rx: 26, ry: 15, label: "Свободное пространство" }],
        },
        {
          v: "Разгон",
          t: "ЦП1 → АП",
          d: "АП забирает мяч на скорости. ФРВ начинают разбегаться по флангам, растягивая двух оставшихся защитников.",
          ball: "am",
          us: { am: [48, 72], st1: [38, 56], st2: [64, 54] },
          opp: { o_m1: [38, 84], o_m2: [66, 84] },
          lines: [{ from: "cm1", to: "am", type: "pass" }],
        },
        {
          v: "В ноги",
          t: "АП → ЛФРВ, рывок ПФРВ",
          d: "ЛФРВ принимает и фиксирует на себе защитника. ПФРВ в этот момент уходит за спину второму.",
          ball: "st1",
          us: { st1: [42, 44], st2: [62, 28] },
          opp: { o_d2: [44, 34] },
          lines: [
            { from: "am", to: "st1", type: "pass" },
            { from: [64, 54], to: [62, 28], type: "run", label: "рывок" },
          ],
        },
        {
          v: "Вразрез",
          t: "Передача за спину",
          d: "Защитники соперника не успевают вернуться — двое против двух превращается в выход один на один.",
          ball: "st2",
          us: { st2: [57, 18] },
          opp: { o_d3: [62, 34], o_gk: [50, 15] },
          lines: [{ from: "st1", to: "st2", type: "pass" }],
        },
        {
          v: "Удар",
          t: "Выход один на один",
          d: "Завершение.",
          ball: [50, 3],
          lines: [{ from: "st2", to: [50, 5], type: "shot" }],
        },
      ],
    },
  ],
};

const PRINCIPLES = [
  ["Касания", "Не более двух касаний на игрока."],
  ["Прессинг", "После потери — 5–7 секунд активного прессинга."],
  ["Перевод", "Нет пространства — перевод на противоположный фланг."],
  ["ФРВ1", "Постоянно двигается между линиями и стягивает защитников."],
  ["ФРВ2", "Всегда ищет рывок за спину защитникам."],
  ["Правый защитник", "Главный источник навесов и прострелов."],
  ["Левый защитник", "Использует скорость, избегает затяжного дриблинга."],
];

/* ---------------------- ГЕОМЕТРИЯ ---------------------- */

const LINE_STYLE = {
  pass: { c: T.pass, w: 1.15, dash: null, arrow: true, curve: 0.1 },
  cross: { c: T.cross, w: 1.15, dash: null, arrow: true, curve: 0.18 },
  dribble: { c: T.dribble, w: 1.3, dash: "3.5 2.2", arrow: true, curve: 0.06 },
  run: { c: T.run, w: 1.1, dash: "3 2.4", arrow: true, curve: 0.12 },
  move: { c: T.move, w: 0.95, dash: "2.4 2.2", arrow: true, curve: 0.1 },
  oppMove: { c: T.oppMove, w: 0.95, dash: "2.4 2.2", arrow: true, curve: 0.1 },
  oppPass: { c: T.oppMove, w: 1.05, dash: null, arrow: true, curve: 0.1 },
  shot: { c: T.shot, w: 1.9, dash: null, arrow: true, curve: 0.03 },
  option: { c: T.option, w: 0.95, dash: "1.6 2.2", arrow: true, curve: 0.1 },
  blocked: { c: T.oppMove, w: 0.9, dash: "1.5 2.5", arrow: false, curve: 0.1 },
};

const LEGEND = [
  ["pass", "Передача"],
  ["cross", "Навес / прострел"],
  ["dribble", "Дриблинг"],
  ["run", "Рывок / движение"],
  ["oppMove", "Реакция соперника"],
  ["option", "Вариант решения"],
  ["shot", "Удар"],
];

function buildFrames(f, tac) {
  const frames = [];
  const us = {};
  const opp = {};
  f.us.forEach((p) => (us[p[0]] = { id: p[0], label: p[1], x: p[2], y: p[3] }));
  f.opp.forEach((p) => (opp[p[0]] = { id: p[0], label: p[1], x: p[2], y: p[3] }));
  let cur = { us: { ...us }, opp: { ...opp }, ball: tac.steps[0].ball };
  tac.steps.forEach((s) => {
    const nu = { ...cur.us };
    const no = { ...cur.opp };
    if (s.us) for (const k in s.us) if (nu[k]) nu[k] = { ...nu[k], x: s.us[k][0], y: s.us[k][1] };
    if (s.opp) for (const k in s.opp) if (no[k]) no[k] = { ...no[k], x: s.opp[k][0], y: s.opp[k][1] };
    cur = { us: nu, opp: no, ball: s.ball !== undefined ? s.ball : cur.ball };
    frames.push(cur);
  });
  return frames;
}

function resolvePt(ref, frame) {
  if (Array.isArray(ref)) return { x: ref[0], y: ref[1] };
  return frame.us[ref] || frame.opp[ref] || null;
}

function trimmedPath(a, b, curve, padA = 5.2, padB = 5.6) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const p1 = { x: a.x + ux * padA, y: a.y + uy * padA };
  const p2 = { x: b.x - ux * padB, y: b.y - uy * padB };
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const cx = mx - (p2.y - p1.y) * curve;
  const cy = my + (p2.x - p1.x) * curve;
  return { d: `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`, mid: { x: cx, y: cy } };
}

/* ---------------------- ПОЛЕ ---------------------- */

function Pitch({ frame, step, tac, showOpp, showLines, showZones, dur, frames }) {
  const ballPt = useMemo(() => {
    const b = frame.ball;
    if (Array.isArray(b)) return { x: b[0], y: b[1] };
    const p = frame.us[b] || frame.opp[b];
    return p ? { x: p.x + 3.4, y: p.y + 3.2 } : { x: 50, y: 70 };
  }, [frame]);

  const cur = tac.steps[step];
  const zones = showZones ? cur.zones || [] : [];

  const drawnLines = [];
  if (showLines) {
    for (let i = 0; i <= step; i++) {
      const s = tac.steps[i];
      if (!s.lines) continue;
      const active = i === step;
      s.lines.forEach((l, j) => {
        if (!active && !["pass", "cross", "dribble", "shot", "oppPass"].includes(l.type)) return;
        const fr = frames[i];
        const a = resolvePt(l.from, fr);
        const b = resolvePt(l.to, fr);
        if (!a || !b) return;
        drawnLines.push({ key: `${i}-${j}`, a, b, l, active });
      });
    }
  }

  return (
    <svg viewBox="-7 -11 114 162" style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="turf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12503C" />
          <stop offset="55%" stopColor="#0E4132" />
          <stop offset="100%" stopColor="#0B3328" />
        </linearGradient>
        <radialGradient id="vignette" cx="50%" cy="45%" r="72%">
          <stop offset="55%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
        </radialGradient>
        <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="hatch" width="3" height="3" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="3" stroke={T.zone} strokeWidth="0.9" opacity="0.5" />
        </pattern>
        {Object.entries(LINE_STYLE).map(([k, v]) => (
          <marker
            key={k}
            id={`ah-${k}`}
            viewBox="0 0 10 10"
            refX="8.5"
            refY="5"
            markerWidth="4.6"
            markerHeight="4.6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill={v.c} />
          </marker>
        ))}
      </defs>

      {/* газон */}
      <rect x="-7" y="-11" width="114" height="162" fill="#081A15" rx="3" />
      <rect x="0" y="0" width="100" height="140" fill="url(#turf)" rx="1" />
      {Array.from({ length: 10 }).map((_, i) =>
        i % 2 === 0 ? (
          <rect key={i} x="0" y={i * 14} width="100" height="14" fill="#FFFFFF" opacity="0.022" />
        ) : null
      )}
      <rect x="0" y="0" width="100" height="140" fill="url(#vignette)" />

      {/* разметка */}
      <g stroke="#FFFFFF" strokeOpacity="0.3" fill="none" strokeWidth="0.55">
        <rect x="0" y="0" width="100" height="140" />
        <line x1="0" y1="70" x2="100" y2="70" />
        <circle cx="50" cy="70" r="13" />
        <circle cx="50" cy="70" r="0.9" fill="#FFFFFF" fillOpacity="0.4" stroke="none" />
        <rect x="22" y="0" width="56" height="20" />
        <rect x="38" y="0" width="24" height="7" />
        <rect x="22" y="120" width="56" height="20" />
        <rect x="38" y="133" width="24" height="7" />
        <circle cx="50" cy="13" r="0.9" fill="#FFFFFF" fillOpacity="0.4" stroke="none" />
        <circle cx="50" cy="127" r="0.9" fill="#FFFFFF" fillOpacity="0.4" stroke="none" />
        <path d="M 22 20 A 13 13 0 0 0 78 20" />
        <path d="M 22 120 A 13 13 0 0 1 78 120" />
      </g>
      <g stroke="#FFFFFF" strokeOpacity="0.5" fill="#FFFFFF" fillOpacity="0.08" strokeWidth="0.5">
        <rect x="42" y="-2.6" width="16" height="2.6" />
        <rect x="42" y="140" width="16" height="2.6" />
      </g>
      <text x="50" y="-5" textAnchor="middle" fontSize="3.2" fill={T.dimmer} letterSpacing="1.6" style={{ fontFamily: "var(--mono)" }}>
        ВОРОТА СОПЕРНИКА
      </text>

      {/* зоны */}
      {zones.map((z, i) => (
        <g key={`z${i}`} style={{ animation: "zonePop .5s ease both" }}>
          <ellipse cx={z.x} cy={z.y} rx={z.rx} ry={z.ry} fill="url(#hatch)" opacity="0.4" />
          <ellipse
            cx={z.x}
            cy={z.y}
            rx={z.rx}
            ry={z.ry}
            fill="none"
            stroke={T.zone}
            strokeWidth="0.6"
            strokeDasharray="2.5 2"
            opacity="0.85"
          />
          <text
            x={z.x}
            y={z.y + z.ry + 4}
            textAnchor="middle"
            fontSize="3.1"
            fill={T.zone}
            opacity="0.95"
            style={{ fontFamily: "var(--mono)", letterSpacing: "0.3px" }}
          >
            {z.label}
          </text>
        </g>
      ))}

      {/* линии */}
      {drawnLines.map(({ key, a, b, l, active }) => {
        const st = LINE_STYLE[l.type];
        const { d, mid } = trimmedPath(a, b, st.curve);
        return (
          <g key={key} opacity={active ? 1 : 0.22}>
            <path
              d={d}
              fill="none"
              stroke={st.c}
              strokeWidth={st.w}
              strokeLinecap="round"
              strokeDasharray={st.dash || undefined}
              markerEnd={st.arrow ? `url(#ah-${l.type})` : undefined}
              filter={active ? "url(#glow)" : undefined}
              style={active && st.dash ? { animation: "flow 1s linear infinite" } : undefined}
            />
            {l.type === "blocked" && active && (
              <g>
                <line x1={mid.x - 2} y1={mid.y - 2} x2={mid.x + 2} y2={mid.y + 2} stroke={st.c} strokeWidth="0.9" />
                <line x1={mid.x + 2} y1={mid.y - 2} x2={mid.x - 2} y2={mid.y + 2} stroke={st.c} strokeWidth="0.9" />
              </g>
            )}
            {l.label && active && (
              <text
                x={mid.x}
                y={mid.y - 1.6}
                textAnchor="middle"
                fontSize="2.9"
                fill={st.c}
                style={{ fontFamily: "var(--mono)", letterSpacing: "0.3px" }}
              >
                {l.label}
              </text>
            )}
          </g>
        );
      })}

      {/* соперник */}
      {showOpp &&
        Object.values(frame.opp).map((p) => (
          <g
            key={p.id}
            transform={`translate(${p.x},${p.y})`}
            style={{ transition: `transform ${dur}s cubic-bezier(.4,0,.2,1)` }}
          >
            <circle r="3.4" fill={T.opp} fillOpacity="0.2" stroke={T.opp} strokeWidth="0.7" strokeOpacity="0.85" />
            <text
              y="1.15"
              textAnchor="middle"
              fontSize="2.7"
              fill={T.opp}
              opacity="0.95"
              style={{ fontFamily: "var(--mono)" }}
            >
              {p.label}
            </text>
          </g>
        ))}

      {/* наша команда */}
      {Object.values(frame.us).map((p) => {
        const isGk = p.id === "gk";
        const hasBall = frame.ball === p.id;
        return (
          <g
            key={p.id}
            transform={`translate(${p.x},${p.y})`}
            style={{ transition: `transform ${dur}s cubic-bezier(.4,0,.2,1)` }}
          >
            {hasBall && <circle r="6.6" fill={T.us} opacity="0.14" />}
            <circle
              r="4"
              fill={isGk ? T.gk : T.us}
              stroke={hasBall ? "#FFFFFF" : "#06121F"}
              strokeWidth={hasBall ? 0.9 : 0.6}
              filter={hasBall ? "url(#glow)" : undefined}
            />
            <text
              y="1.3"
              textAnchor="middle"
              fontSize="2.9"
              fontWeight="700"
              fill="#06121F"
              style={{ fontFamily: "var(--mono)" }}
            >
              {p.label}
            </text>
          </g>
        );
      })}

      {/* мяч */}
      <g
        transform={`translate(${ballPt.x},${ballPt.y})`}
        style={{ transition: `transform ${dur}s cubic-bezier(.34,.8,.3,1)` }}
      >
        <circle r="3.4" fill="#FFFFFF" opacity="0.22" />
        <circle r="1.75" fill="#FFFFFF" stroke="#0A101E" strokeWidth="0.4" />
        <circle r="0.6" fill="#0A101E" opacity="0.75" />
      </g>
    </svg>
  );
}

/* ---------------------- UI ---------------------- */

function Btn({ children, onClick, active, disabled, title, wide }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        fontFamily: "var(--mono)",
        fontSize: 12,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: wide ? "9px 16px" : "9px 12px",
        borderRadius: 8,
        border: `1px solid ${active ? T.us : T.edge}`,
        background: active ? "rgba(76,201,240,.14)" : T.panelHi,
        color: disabled ? T.dimmer : active ? T.us : T.text,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "all .15s ease",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [mode, setMode] = useState("8x8");
  const [ti, setTi] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showOpp, setShowOpp] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [showZones, setShowZones] = useState(true);

  const f = FORMATIONS[mode];
  const list = TACTICS[mode];
  const tac = list[Math.min(ti, list.length - 1)];
  const frames = useMemo(() => buildFrames(f, tac), [f, tac]);
  const last = tac.steps.length - 1;
  const frame = frames[Math.min(step, last)];
  const dur = Math.max(0.18, 0.75 / speed);

  const go = useCallback(
    (n) => {
      setStep((s) => Math.max(0, Math.min(last, typeof n === "function" ? n(s) : n)));
    },
    [last]
  );

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [mode, ti]);

  useEffect(() => {
    if (!playing) return;
    if (step >= last) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), 1900 / speed);
    return () => clearTimeout(id);
  }, [playing, step, speed, last]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); setPlaying(false); go((s) => s + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setPlaying(false); go((s) => s - 1); }
      if (e.code === "Space") { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [go]);

  const cur = tac.steps[Math.min(step, last)];
  const kindColor = tac.kind === "Оборона" ? T.opp : tac.kind === "Контратака" ? T.run : T.dribble;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(1100px 620px at 18% -8%, #16273F 0%, ${T.ink} 62%)`,
        color: T.text,
        fontFamily: "var(--body)",
        padding: "18px 14px 40px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        :root{
          --display:'Oswald', 'Arial Narrow', system-ui, sans-serif;
          --body:'IBM Plex Sans', system-ui, -apple-system, sans-serif;
          --mono:'IBM Plex Mono', ui-monospace, monospace;
        }
        *{box-sizing:border-box}
        button:focus-visible{outline:2px solid ${T.us}; outline-offset:2px}
        @keyframes flow{to{stroke-dashoffset:-12}}
        @keyframes zonePop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .stack{display:flex;flex-direction:column;gap:14px}
        .cols{display:grid;grid-template-columns:1fr;gap:14px}
        .cols > div{min-width:0}
        @media(min-width:940px){.cols{grid-template-columns:minmax(0,1fr) 380px;align-items:start}}
        .scrollx{overflow-x:auto;-webkit-overflow-scrolling:touch}
        .scrollx::-webkit-scrollbar{height:6px}
        .scrollx::-webkit-scrollbar-thumb{background:${T.edge};border-radius:3px}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
      `}</style>

      <div style={{ maxWidth: 1240, margin: "0 auto" }} className="stack">
        {/* шапка */}
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: `1px solid ${T.edge}`,
            paddingBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.28em",
                color: T.dimmer,
                textTransform: "uppercase",
              }}
            >
              Тактическая доска
            </div>
            <h1
              style={{
                fontFamily: "var(--display)",
                fontWeight: 700,
                fontSize: "clamp(30px,6vw,46px)",
                lineHeight: 0.95,
                margin: "6px 0 0",
                textTransform: "uppercase",
                letterSpacing: "0.01em",
              }}
            >
              Разыгровка мяча
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.keys(FORMATIONS).map((k) => (
              <Btn key={k} onClick={() => setMode(k)} active={mode === k} wide>
                {FORMATIONS[k].label}
              </Btn>
            ))}
          </div>
        </header>

        {/* сводка режима */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 18,
            alignItems: "center",
            background: T.panel,
            border: `1px solid ${T.edge}`,
            borderRadius: 12,
            padding: "12px 16px",
          }}
        >
          <div style={{ fontFamily: "var(--display)", fontSize: 26, letterSpacing: "0.08em", color: T.us }}>
            {f.scheme}
          </div>
          <div style={{ flex: "1 1 320px", fontSize: 13.5, color: T.dim, lineHeight: 1.5 }}>{f.idea}</div>
        </div>

        <div className="cols">
          {/* поле */}
          <div
            style={{
              background: T.panel,
              border: `1px solid ${T.edge}`,
              borderRadius: 14,
              padding: 12,
              minWidth: 0,
            }}
          >
            <Pitch
              frame={frame}
              frames={frames}
              step={Math.min(step, last)}
              tac={tac}
              showOpp={showOpp}
              showLines={showLines}
              showZones={showZones}
              dur={dur}
            />

            {/* лента шагов */}
            <div className="scrollx" style={{ marginTop: 12, paddingBottom: 4, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, minWidth: "min-content" }}>
                {tac.steps.map((s, i) => {
                  const done = i < step;
                  const act = i === step;
                  return (
                    <button
                      key={i}
                      onClick={() => { setPlaying(false); go(i); }}
                      style={{
                        flex: "0 0 auto",
                        textAlign: "left",
                        padding: "7px 10px",
                        borderRadius: 8,
                        cursor: "pointer",
                        background: act ? "rgba(76,201,240,.16)" : done ? T.panelHi : "transparent",
                        border: `1px solid ${act ? T.us : T.edge}`,
                        color: act ? T.us : done ? T.text : T.dimmer,
                        transition: "all .15s ease",
                      }}
                    >
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, opacity: 0.75 }}>
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--display)",
                          fontSize: 13,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {s.v}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* управление */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, alignItems: "center" }}>
              <Btn onClick={() => { setPlaying(false); go(0); }} title="В начало">⏮</Btn>
              <Btn onClick={() => { setPlaying(false); go((s) => s - 1); }} disabled={step === 0} title="Шаг назад">◀</Btn>
              <Btn
                onClick={() => { if (step >= last) { go(0); setPlaying(true); } else setPlaying((p) => !p); }}
                active={playing}
                wide
              >
                {playing ? "❚❚ Пауза" : step >= last ? "↻ Заново" : "▶ Запустить"}
              </Btn>
              <Btn onClick={() => { setPlaying(false); go((s) => s + 1); }} disabled={step === last} title="Шаг вперёд">▶</Btn>
              <div style={{ display: "flex", gap: 4, marginLeft: "auto", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: T.dimmer, marginRight: 4 }}>
                  СКОРОСТЬ
                </span>
                {[0.5, 1, 1.5, 2].map((v) => (
                  <Btn key={v} onClick={() => setSpeed(v)} active={speed === v}>
                    {v}×
                  </Btn>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <Btn onClick={() => setShowOpp((v) => !v)} active={showOpp}>Соперник</Btn>
              <Btn onClick={() => setShowLines((v) => !v)} active={showLines}>Линии</Btn>
              <Btn onClick={() => setShowZones((v) => !v)} active={showZones}>Зоны</Btn>
            </div>

            {/* легенда */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.edge}` }}>
              {LEGEND.map(([k, label]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="22" height="8">
                    <line
                      x1="1" y1="4" x2="21" y2="4"
                      stroke={LINE_STYLE[k].c}
                      strokeWidth={LINE_STYLE[k].w * 1.6}
                      strokeDasharray={LINE_STYLE[k].dash || undefined}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: T.dim, letterSpacing: "0.04em" }}>
                    {label.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* правая колонка */}
          <div className="stack">
            {/* выбор тактики */}
            <div style={{ background: T.panel, border: `1px solid ${T.edge}`, borderRadius: 14, padding: 12 }}>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10.5,
                  letterSpacing: "0.24em",
                  color: T.dimmer,
                  marginBottom: 10,
                }}
              >
                СЦЕНАРИИ
              </div>
              <div className="stack" style={{ gap: 7 }}>
                {list.map((t, i) => {
                  const act = i === ti;
                  const kc = t.kind === "Оборона" ? T.opp : t.kind === "Контратака" ? T.run : T.dribble;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTi(i)}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 10,
                        cursor: "pointer",
                        background: act ? "rgba(76,201,240,.12)" : T.panelHi,
                        border: `1px solid ${act ? T.us : T.edge}`,
                        color: T.text,
                        transition: "all .15s ease",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 9.5,
                          letterSpacing: "0.18em",
                          color: kc,
                          marginBottom: 3,
                        }}
                      >
                        {t.kind.toUpperCase()}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--display)",
                          fontSize: 17,
                          textTransform: "uppercase",
                          letterSpacing: "0.02em",
                          lineHeight: 1.1,
                        }}
                      >
                        {t.name}
                      </div>
                      <div style={{ fontSize: 12, color: T.dim, marginTop: 3 }}>{t.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* текущий шаг */}
            <div
              key={`${mode}-${ti}-${step}`}
              style={{
                background: `linear-gradient(160deg, ${T.panelHi}, ${T.panel})`,
                border: `1px solid ${T.edge}`,
                borderLeft: `3px solid ${kindColor}`,
                borderRadius: 14,
                padding: 16,
                animation: "fadeUp .32s ease both",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div
                  style={{
                    fontFamily: "var(--display)",
                    fontSize: 40,
                    lineHeight: 0.8,
                    color: T.us,
                    opacity: 0.9,
                  }}
                >
                  {String(step + 1).padStart(2, "0")}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: T.dimmer }}>
                  / {String(last + 1).padStart(2, "0")}
                </div>
              </div>
              <h2
                style={{
                  fontFamily: "var(--display)",
                  fontSize: 21,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  margin: "10px 0 8px",
                  lineHeight: 1.1,
                }}
              >
                {cur.t}
              </h2>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "#C6D2E6" }}>{cur.d}</p>
            </div>

            {/* принципы */}
            <div style={{ background: T.panel, border: `1px solid ${T.edge}`, borderRadius: 14, padding: 12 }}>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10.5,
                  letterSpacing: "0.24em",
                  color: T.dimmer,
                  marginBottom: 10,
                }}
              >
                ОБЩИЕ ПРИНЦИПЫ
              </div>
              <div className="stack" style={{ gap: 0 }}>
                {PRINCIPLES.map(([k, v], i) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "9px 0",
                      borderTop: i ? `1px solid ${T.edge}` : "none",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: T.dimmer,
                        paddingTop: 3,
                        minWidth: 16,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 13.5, lineHeight: 1.45 }}>
                      <b style={{ color: T.us, fontWeight: 600 }}>{k}.</b>{" "}
                      <span style={{ color: T.dim }}>{v}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            color: T.dimmer,
            letterSpacing: "0.06em",
            textAlign: "center",
          }}
        >
          ← → ШАГИ · ПРОБЕЛ — ВОСПРОИЗВЕДЕНИЕ
        </div>
      </div>
    </div>
  );
}
