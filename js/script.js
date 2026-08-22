/* ==========================================================================
   Calculator — script.js
   Handles: digit entry, decimal, chained operations (+ − × ÷), percent,
   clear, backspace, equals, keyboard support, divide-by-zero handling.
   ========================================================================== */

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const expressionEl = $("#expression");
  const resultEl = $("#result");
  const keysEl = $("#keys");

  /* ------------------------------------------------------------------ *
   * State
   * ------------------------------------------------------------------ */
  const state = {
    current: "0",     // value currently being typed / shown
    previous: null,    // stored left-hand operand
    operator: null,    // pending operator: + − × ÷
    waitingForOperand: false,
    justEvaluated: false, // true right after "=" was pressed
  };

  const MAX_DIGITS = 14;

  /* ------------------------------------------------------------------ *
   * Rendering
   * ------------------------------------------------------------------ */
  function formatNumber(numStr) {
    if (numStr === "Error") return numStr;
    numStr = String(numStr);
    const [intPart, decPart] = numStr.split(".");
    const withCommas = Number(intPart).toLocaleString("en-US");
    return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
  }

  function render() {
    resultEl.textContent = formatNumber(state.current);
    resultEl.classList.remove("is-updated");
    // Force reflow so the animation can retrigger
    void resultEl.offsetWidth;
    resultEl.classList.add("is-updated");

    if (state.operator && state.previous !== null) {
      expressionEl.textContent = `${formatNumber(state.previous)} ${state.operator}`;
    } else {
      expressionEl.innerHTML = "&nbsp;";
    }

    // Highlight the active operator key
    document.querySelectorAll(".key--op").forEach((btn) => {
      btn.classList.toggle("is-active", state.operator === btn.dataset.op && !state.justEvaluated);
    });
  }

  /* ------------------------------------------------------------------ *
   * Core actions
   * ------------------------------------------------------------------ */
  function inputDigit(digit) {
    if (state.current === "Error" || state.justEvaluated || state.waitingForOperand) {
      state.current = digit;
      state.waitingForOperand = false;
      state.justEvaluated = false;
    } else if (state.current === "0") {
      state.current = digit;
    } else if (state.current.replace(/[.-]/g, "").length < MAX_DIGITS) {
      state.current += digit;
    }
  }

  function inputDecimal() {
    if (state.current === "Error" || state.justEvaluated || state.waitingForOperand) {
      state.current = "0.";
      state.waitingForOperand = false;
      state.justEvaluated = false;
      return;
    }
    if (!state.current.includes(".")) {
      state.current += ".";
    }
  }

  function clearAll() {
    state.current = "0";
    state.previous = null;
    state.operator = null;
    state.waitingForOperand = false;
    state.justEvaluated = false;
  }

  function backspace() {
    if (state.current === "Error" || state.justEvaluated) {
      clearAll();
      return;
    }
    state.current = state.current.length > 1 ? state.current.slice(0, -1) : "0";
  }

  function toPercent() {
    if (state.current === "Error") return;
    state.current = String(parseFloat(state.current) / 100);
  }

  function compute(a, op, b) {
    switch (op) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? null : a / b;
      default: return b;
    }
  }

  function chooseOperator(op) {
    if (state.current === "Error") return;

    if (state.operator && !state.justEvaluated) {
      if (state.waitingForOperand) {
        state.operator = op;
        return;
      }
      // Chain: evaluate what's pending first
      const result = compute(state.previous, state.operator, parseFloat(state.current));
      if (result === null) {
        state.current = "Error";
        state.previous = null;
        state.operator = null;
        return;
      }
      state.previous = roundResult(result);
      state.current = String(state.previous);
    } else {
      state.previous = parseFloat(state.current);
    }

    state.operator = op;
    state.waitingForOperand = true;
    state.justEvaluated = false;
  }

  function roundResult(num) {
    // Avoid floating point artifacts like 0.1 + 0.2 = 0.30000000000000004
    return Math.round((num + Number.EPSILON) * 1e10) / 1e10;
  }

  function evaluate() {
    if (state.operator === null || state.previous === null || state.current === "Error") return;

    const result = compute(state.previous, state.operator, parseFloat(state.current));
    if (result === null) {
      state.current = "Error";
    } else {
      state.current = String(roundResult(result));
    }
    state.previous = null;
    state.operator = null;
    state.waitingForOperand = false;
    state.justEvaluated = true;
  }

  /* ------------------------------------------------------------------ *
   * Click handling (event delegation)
   * ------------------------------------------------------------------ */
  keysEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".key");
    if (!btn) return;

    flashKey(btn);

    if (btn.dataset.num !== undefined) {
      inputDigit(btn.dataset.num);
    } else if (btn.dataset.action === "decimal") {
      inputDecimal();
    } else if (btn.dataset.action === "clear") {
      clearAll();
    } else if (btn.dataset.action === "backspace") {
      backspace();
    } else if (btn.dataset.action === "percent") {
      toPercent();
    } else if (btn.dataset.action === "operator") {
      chooseOperator(btn.dataset.op);
    } else if (btn.dataset.action === "equals") {
      evaluate();
    }

    render();
  });

  function flashKey(btn) {
    btn.classList.add("is-pressed");
    setTimeout(() => btn.classList.remove("is-pressed"), 120);
  }

  /* ------------------------------------------------------------------ *
   * Keyboard support
   * ------------------------------------------------------------------ */
  const KEY_TO_OP = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  document.addEventListener("keydown", (e) => {
    const { key } = e;

    if (/^[0-9]$/.test(key)) {
      inputDigit(key);
    } else if (key === ".") {
      inputDecimal();
    } else if (key in KEY_TO_OP) {
      e.preventDefault();
      chooseOperator(KEY_TO_OP[key]);
    } else if (key === "Enter" || key === "=") {
      e.preventDefault();
      evaluate();
    } else if (key === "Backspace") {
      backspace();
    } else if (key === "Escape") {
      clearAll();
    } else if (key === "%") {
      toPercent();
    } else {
      return; // ignore other keys, skip render
    }

    render();
  });

  /* ------------------------------------------------------------------ *
   * Init
   * ------------------------------------------------------------------ */
  render();
})();