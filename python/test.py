import json
import matplotlib.pyplot as plt
import numpy as np

# -------------------------------
# LOAD DATA
# -------------------------------
with open("trainer_state.json", "r") as f:
    data = json.load(f)

log_history = data["log_history"]

steps, losses, grads, lrs = [], [], [], []

for entry in log_history:
    if "loss" in entry:
        steps.append(entry["step"])
        losses.append(entry["loss"])
        grads.append(entry["grad_norm"])
        lrs.append(entry["learning_rate"])

# -------------------------------
# SMOOTHING (STRONGER + CLEAN)
# -------------------------------
def smooth(y, window=7):
    return np.convolve(y, np.ones(window)/window, mode='same')

losses_s = smooth(losses)
grads_s = smooth(grads)

# -------------------------------
# CLEAN STYLE (NO GRID, MINIMAL)
# -------------------------------
plt.rcParams.update({
    "axes.grid": False,   # 🔥 disable grid globally
})

# -------------------------------
# 1. LOSS CURVE
# -------------------------------
plt.figure(figsize=(5.5, 3.8))

plt.plot(steps, losses_s, linewidth=2)

plt.xlabel("Steps")
plt.ylabel("Loss")

plt.title("Training Loss", pad=10)

# Remove top/right borders (clean academic look)
plt.gca().spines['top'].set_visible(False)
plt.gca().spines['right'].set_visible(False)

plt.tight_layout()
plt.savefig("loss_curve_paper.png", dpi=400)
plt.close()

# -------------------------------
# 2. GRADIENT NORM
# -------------------------------
plt.figure(figsize=(5.5, 3.8))

plt.plot(steps, grads_s, linewidth=2)

plt.xlabel("Steps")
plt.ylabel("Gradient Norm")

plt.title("Gradient Stability", pad=10)

plt.gca().spines['top'].set_visible(False)
plt.gca().spines['right'].set_visible(False)

plt.tight_layout()
plt.savefig("gradient_curve_paper.png", dpi=400)
plt.close()

# -------------------------------
# 3. LEARNING RATE
# -------------------------------
plt.figure(figsize=(5.5, 3.8))

plt.plot(steps, lrs, linewidth=2)

plt.xlabel("Steps")
plt.ylabel("Learning Rate")

plt.title("Learning Rate Schedule", pad=10)

plt.gca().spines['top'].set_visible(False)
plt.gca().spines['right'].set_visible(False)

plt.tight_layout()
plt.savefig("learning_rate_curve_paper.png", dpi=400)
plt.close()

print("✅ Ultra-clean professional plots saved (400 DPI)")