const brewForm = document.querySelector("#brew-form");
const brewMethod = document.querySelector("#brew-method");
const waterInput = document.querySelector("#water");
const coffeeInput = document.querySelector("#coffee");
const ratioInput = document.querySelector("#ratio");
const bloomProfileInput = document.querySelector("#bloom-profile");
const bodyProfileInput = document.querySelector("#body-profile");
const fourSixControls = document.querySelector("#four-six-controls");
const generalControls = document.querySelector("#general-controls");
const bloomMultiplierInput = document.querySelector("#bloom-multiplier");
const pourCountInput = document.querySelector("#pour-count");
const resetButton = document.querySelector("#reset-button");

const resultSummary = document.querySelector("#result-summary");
const statWater = document.querySelector("#stat-water");
const statCoffee = document.querySelector("#stat-coffee");
const statRatio = document.querySelector("#stat-ratio");
const recipeSteps = document.querySelector("#recipe-steps");
const recipeChart = document.querySelector("#recipe-chart");
const chartCard = document.querySelector("#chart-card");
const themeToggle = document.querySelector("#theme-toggle");

const themeStorageKey = "coffee-theme";

const baseRecipeMessage =
  "Enter any two values to generate a starting recipe.";

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

function formatGrams(value) {
  return `${roundToTenth(value).toFixed(1)} g`;
}

function formatRatio(value) {
  return `1:${roundToTenth(value).toFixed(1)}`;
}

function buildStepData(pours, labels) {
  let runningTotal = 0;

  return pours.map((pour, index) => {
    runningTotal += pour;

    return {
      label: labels[index]?.label ?? `Pour ${index + 1}`,
      stage: labels[index]?.stage ?? "Pour",
      pour,
      target: runningTotal,
    };
  });
}

function drawRecipeChart(steps) {
  if (!recipeChart || !chartCard) {
    return;
  }

  chartCard.hidden = steps.length === 0;

  const context = recipeChart.getContext("2d");

  if (!context) {
    return;
  }

  const cssWidth = recipeChart.clientWidth || 640;
  const cssHeight = 280;
  const scale = window.devicePixelRatio || 1;

  recipeChart.width = Math.round(cssWidth * scale);
  recipeChart.height = Math.round(cssHeight * scale);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);

  const padding = { top: 20, right: 18, bottom: 36, left: 72 };
  const chartWidth = cssWidth - padding.left - padding.right;
  const chartHeight = cssHeight - padding.top - padding.bottom;

  const styles = getComputedStyle(document.body);
  const mutedColor = styles.getPropertyValue("--muted").trim() || "#6f5a4c";
  const textColor = styles.getPropertyValue("--text").trim() || "#2d2017";
  const accentColor = styles.getPropertyValue("--accent").trim() || "#9a5631";
  const axisColor = styles.getPropertyValue("--chart-axis").trim() || "rgba(88, 57, 33, 0.18)";
  const gridColor = styles.getPropertyValue("--chart-grid").trim() || "rgba(88, 57, 33, 0.08)";

  context.strokeStyle = axisColor;
  context.lineWidth = 1;
  context.font = "12px Manrope";
  context.fillStyle = mutedColor;

  context.beginPath();
  context.moveTo(padding.left, padding.top);
  context.lineTo(padding.left, padding.top + chartHeight);
  context.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  context.stroke();

  if (!steps.length) {
    context.fillText("Add a recipe to see the graph.", padding.left, padding.top + 20);
    return;
  }

  const maxTarget = Math.max(...steps.map((step) => step.target));
  const yTickCount = 4;

  for (let tick = 0; tick <= yTickCount; tick += 1) {
    const value = (maxTarget / yTickCount) * tick;
    const y = padding.top + chartHeight - (value / maxTarget) * chartHeight;

    context.strokeStyle = gridColor;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(padding.left + chartWidth, y);
    context.stroke();

    context.fillStyle = mutedColor;
    context.textAlign = "right";
    context.fillText(`${roundToTenth(value).toFixed(0)}g`, padding.left - 10, y + 4);
  }

  const points = steps.map((step, index) => {
    const x =
      steps.length === 1
        ? padding.left + chartWidth / 2
        : padding.left + (chartWidth / (steps.length - 1)) * index;
    const y = padding.top + chartHeight - (step.target / maxTarget) * chartHeight;

    return { x, y, label: step.label, target: step.target, pour: step.pour };
  });

  context.strokeStyle = accentColor;
  context.lineWidth = 3;
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.stroke();

  points.forEach((point, index) => {
    context.fillStyle = accentColor;
    context.beginPath();
    context.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = textColor;
    context.textAlign = "center";
    context.fillText(`${index + 1}`, point.x, padding.top + chartHeight + 20);
  });

  context.save();
  context.translate(20, padding.top + chartHeight / 2);
  context.rotate(-Math.PI / 2);
  context.textAlign = "center";
  context.fillStyle = mutedColor;
  context.fillText("Water", 0, 0);
  context.restore();

  context.textAlign = "center";
  context.fillStyle = mutedColor;
  context.fillText("Pours", padding.left + chartWidth / 2, cssHeight - 8);
}

function getSavedTheme() {
  return window.localStorage.getItem(themeStorageKey) || "light";
}

function setTheme(theme) {
  document.body.dataset.theme = theme;

  if (themeToggle) {
    themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }

  window.localStorage.setItem(themeStorageKey, theme);
}

function readNumber(input) {
  const value = Number.parseFloat(input.value);
  return Number.isFinite(value) ? value : null;
}

function calculateValues(water, coffee, ratio) {
  const filledCount = [water, coffee, ratio].filter((value) => value !== null).length;

  if (filledCount < 2) {
    return { error: "Please fill in any two of water, coffee, or ratio." };
  }

  if (filledCount === 3) {
    const expectedWater = coffee * ratio;
    if (Math.abs(expectedWater - water) > 0.25) {
      return {
        error:
          "These three values do not match. Adjust one value so the ratio stays consistent.",
      };
    }
  }

  if (water === null) {
    water = coffee * ratio;
  } else if (coffee === null) {
    coffee = water / ratio;
  } else if (ratio === null) {
    ratio = water / coffee;
  }

  if (water <= 0 || coffee <= 0 || ratio <= 0) {
    return { error: "Values need to be greater than zero." };
  }

  return { water, coffee, ratio };
}

function buildFourSixRecipe(totalWater, bloomProfile, bodyProfile) {
  const bloomTotal = totalWater * 0.4;
  const mainPourTotal = totalWater - bloomTotal;

  const bloomFirstPour =
    bloomProfile === "sweet"
      ? bloomTotal * 0.3333
      : bloomProfile === "bright"
        ? bloomTotal * 0.6667
        : bloomTotal * 0.5;

  const bloomSecondPour = bloomTotal - bloomFirstPour;
  const pours = [bloomFirstPour, bloomSecondPour];

  if (bodyProfile === "light") {
    pours.push(mainPourTotal);
  } else if (bodyProfile === "full") {
    pours.push(mainPourTotal / 3, mainPourTotal / 3, mainPourTotal / 3);
  } else {
    pours.push(mainPourTotal / 2, mainPourTotal / 2);
  }

  const labels = pours.map((_, index) => {
    if (index === 0) {
      return { label: "Pour 1", stage: "Bloom" };
    }

    if (index === 1) {
      return { label: "Pour 2", stage: "Bloom" };
    }

    return { label: `Pour ${index + 1}`, stage: "Main Pour" };
  });

  return buildStepData(pours, labels);
}

function buildGeneralRecipe(totalWater, coffeeWeight, bloomMultiplier, pourCount) {
  if (!Number.isFinite(bloomMultiplier) || bloomMultiplier <= 0) {
    return { error: "Bloom multiplier must be greater than zero." };
  }

  if (!Number.isInteger(pourCount) || pourCount < 1) {
    return { error: "Total pours must be a whole number of at least 1." };
  }

  const bloomWater = coffeeWeight * bloomMultiplier;

  if (bloomWater >= totalWater) {
    return {
      error: "Bloom water must be less than the total water for the general recipe.",
    };
  }

  const remainingWater = totalWater - bloomWater;
  const splitPour = pourCount > 0 ? remainingWater / pourCount : 0;
  const pours = [bloomWater];
  const labels = [{ label: "Bloom", stage: "Bloom" }];

  if (pourCount === 0) {
    return { steps: buildStepData(pours, labels) };
  }

  for (let index = 0; index < pourCount; index += 1) {
    pours.push(splitPour);
    labels.push({ label: `Pour ${index + 1}`, stage: "Main Pour" });
  }

  return { steps: buildStepData(pours, labels) };
}

function renderRecipeSteps(steps) {
  recipeSteps.innerHTML = "";

  steps.forEach((step) => {
    const item = document.createElement("li");
    const wrapper = document.createElement("div");
    const target = document.createElement("div");
    const pour = document.createElement("div");
    const stage = document.createElement("div");

    wrapper.className = "recipe-step-line";
    target.className = "recipe-step-target";
    pour.className = "recipe-step-pour";
    stage.className = "recipe-step-pour";

    target.textContent = `${step.label}: ${formatGrams(step.target)}`;
    pour.textContent = `${step.stage}`;
    stage.textContent = `+${formatGrams(step.pour)}`;

    wrapper.append(target, pour, stage);
    item.appendChild(wrapper);
    recipeSteps.appendChild(item);
  });

  drawRecipeChart(steps);
}

function renderResult(values, method) {
  statWater.textContent = formatGrams(values.water);
  statCoffee.textContent = formatGrams(values.coffee);
  statRatio.textContent = formatRatio(values.ratio);

  if (method === "four-six") {
    const steps = buildFourSixRecipe(
      values.water,
      bloomProfileInput.value,
      bodyProfileInput.value
    );

    resultSummary.textContent =
      `4:6 recipe generated with ${steps.length} pours based on bloom and body profile.`;
    renderRecipeSteps(steps);
    return;
  }

  if (method === "general-pourover") {
    const generalRecipe = buildGeneralRecipe(
      values.water,
      values.coffee,
      readNumber(bloomMultiplierInput),
      Number.parseInt(pourCountInput.value, 10)
    );

    if (generalRecipe.error) {
      resultSummary.textContent = generalRecipe.error;
      recipeSteps.innerHTML = "<li>Adjust bloom multiplier or pour count to continue.</li>";
      drawRecipeChart([]);
      return;
    }

    resultSummary.textContent =
      "General pourover recipe generated from bloom multiplier and total pours.";
    renderRecipeSteps(generalRecipe.steps);
    return;
  }

  resultSummary.textContent =
    "Freestyle math is ready. No brew method selected, so only the core values are shown.";
  recipeSteps.innerHTML = `
    <li>Total water: ${formatGrams(values.water)}</li>
    <li>Ground coffee: ${formatGrams(values.coffee)}</li>
    <li>Ratio target: ${formatRatio(values.ratio)}</li>
  `;
  drawRecipeChart([]);
}

function resetResults() {
  resultSummary.textContent = baseRecipeMessage;
  statWater.textContent = "--";
  statCoffee.textContent = "--";
  statRatio.textContent = "--";
  recipeSteps.innerHTML = "<li>Add inputs to generate your first schedule.</li>";
  drawRecipeChart([]);
}

function syncMethodControls() {
  const method = brewMethod.value;
  fourSixControls.hidden = method !== "four-six";
  generalControls.hidden = method !== "general-pourover";
}

function updateRecipe() {
  const values = calculateValues(
    readNumber(waterInput),
    readNumber(coffeeInput),
    readNumber(ratioInput)
  );

  if (values.error) {
    resetResults();
    resultSummary.textContent = values.error;
    return;
  }

  renderResult(values, brewMethod.value);
}

brewForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateRecipe();
});

brewForm.addEventListener("input", () => {
  syncMethodControls();
  updateRecipe();
});

brewForm.addEventListener("change", () => {
  syncMethodControls();
  updateRecipe();
});

resetButton.addEventListener("click", () => {
  brewForm.reset();
  brewMethod.value = "";
  bloomProfileInput.value = "balanced";
  bodyProfileInput.value = "medium";
  bloomMultiplierInput.value = "3";
  pourCountInput.value = "4";
  syncMethodControls();
  resetResults();
});

syncMethodControls();
setTheme(getSavedTheme());
resetResults();

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    updateRecipe();
  });
}

window.addEventListener("resize", () => {
  const activeMethod = brewMethod.value;

  if (!statWater.textContent || statWater.textContent === "--") {
    drawRecipeChart([]);
    return;
  }

  if (activeMethod === "four-six") {
    renderRecipeSteps(
      buildFourSixRecipe(
        readNumber(waterInput) ?? 0,
        bloomProfileInput.value,
        bodyProfileInput.value
      )
    );
    return;
  }

  if (activeMethod === "general-pourover") {
    const values = calculateValues(
      readNumber(waterInput),
      readNumber(coffeeInput),
      readNumber(ratioInput)
    );

    if (values.error) {
      drawRecipeChart([]);
      return;
    }

    const generalRecipe = buildGeneralRecipe(
      values.water,
      values.coffee,
      readNumber(bloomMultiplierInput),
      Number.parseInt(pourCountInput.value, 10)
    );

    drawRecipeChart(generalRecipe.error ? [] : generalRecipe.steps);
  }
});
