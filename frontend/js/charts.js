/* ==========================================================================
   AURA-Sense: Chart.js Telemetry & Analytics Controller
   ========================================================================== */

class EmotionCharts {
  constructor() {
    this.timelineChart = null;
    this.distributionChart = null;
    this.maxDataPoints = 30;

    this.emotionColors = {
      Happy: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.15)" },
      Surprise: { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.15)" },
      Neutral: { stroke: "#06b6d4", fill: "rgba(6, 182, 212, 0.15)" },
      Sad: { stroke: "#6366f1", fill: "rgba(99, 102, 241, 0.15)" },
      Angry: { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.15)" },
      Fear: { stroke: "#a855f7", fill: "rgba(168, 85, 247, 0.15)" },
      Disgust: { stroke: "#84cc16", fill: "rgba(132, 204, 22, 0.15)" }
    };
  }

  initTimelineChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const datasets = Object.keys(this.emotionColors).map((emo) => ({
      label: emo,
      data: [],
      borderColor: this.emotionColors[emo].stroke,
      backgroundColor: this.emotionColors[emo].fill,
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: emo === "Happy" || emo === "Neutral" // subtly highlight primary emotions
    }));

    this.timelineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 }, // zero animation delay for real-time streaming
        interaction: {
          mode: "index",
          intersect: false
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: {
              color: "#64748b",
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              maxTicksLimit: 8
            }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: {
              color: "#64748b",
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              callback: (val) => `${val}%`
            }
          }
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: "#cbd5e1",
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: 600 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: "rgba(15, 21, 37, 0.95)",
            titleColor: "#f8fafc",
            bodyColor: "#cbd5e1",
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`
            }
          }
        }
      }
    });
  }

  addTimelinePoint(timeSec, probabilities) {
    if (!this.timelineChart) return;

    const label = `${timeSec}s`;
    this.timelineChart.data.labels.push(label);

    this.timelineChart.data.datasets.forEach((dataset) => {
      const emo = dataset.label;
      const val = probabilities[emo] !== undefined ? probabilities[emo] : 0;
      dataset.data.push(val);
    });

    // Keep sliding window
    if (this.timelineChart.data.labels.length > this.maxDataPoints) {
      this.timelineChart.data.labels.shift();
      this.timelineChart.data.datasets.forEach((ds) => ds.data.shift());
    }

    this.timelineChart.update("none");
  }

  initDistributionChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const emotions = Object.keys(this.emotionColors);
    const colors = emotions.map((e) => this.emotionColors[e].stroke);

    this.distributionChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: emotions,
        datasets: [{
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: colors,
          borderColor: "#070a12",
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#cbd5e1",
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: "rgba(15, 21, 37, 0.95)",
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`
            }
          }
        },
        cutout: "68%"
      }
    });
  }

  updateDistribution(distObj) {
    if (!this.distributionChart || !distObj) return;

    const emotions = Object.keys(this.emotionColors);
    const values = emotions.map((emo) => distObj[emo] || 0);

    this.distributionChart.data.datasets[0].data = values;
    this.distributionChart.update();
  }

  reset() {
    if (this.timelineChart) {
      this.timelineChart.data.labels = [];
      this.timelineChart.data.datasets.forEach((ds) => { ds.data = []; });
      this.timelineChart.update();
    }
  }
}

window.emotionCharts = new EmotionCharts();
