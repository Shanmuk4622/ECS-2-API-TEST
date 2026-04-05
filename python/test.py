import json
import matplotlib.pyplot as plt
import os

# -------------------------------
# 1. CHECK FILE EXISTS
# -------------------------------
file_path = "trainer_state.json"  # keep file in same folder

if not os.path.exists(file_path):
    print("❌ File not found:", file_path)
    exit()

print("✅ File found")

# -------------------------------
# 2. LOAD FILE
# -------------------------------
with open(file_path, "r") as f:
    data = json.load(f)

if "log_history" not in data:
    print("❌ log_history not found in JSON")
    exit()

log_history = data["log_history"]

print(f"✅ Loaded {len(log_history)} log entries")

# -------------------------------
# 3. EXTRACT VALUES
# -------------------------------
steps = []
losses = []
grad_norms = []
learning_rates = []

for entry in log_history:
    if "loss" in entry:
        steps.append(entry.get("step", 0))
        losses.append(entry.get("loss", 0))
        grad_norms.append(entry.get("grad_norm", 0))
        learning_rates.append(entry.get("learning_rate", 0))

print(f"✅ Extracted {len(steps)} training points")

if len(steps) == 0:
    print("❌ No valid data found (check JSON format)")
    exit()

# -------------------------------
# 4. LOSS CURVE
# -------------------------------
plt.figure()
plt.plot(steps, losses)
plt.xlabel("Steps")
plt.ylabel("Cross-Entropy Loss")
plt.title("Training Loss Curve")
plt.grid()

plt.savefig("loss_curve.png")
print("✅ Saved loss_curve.png")

# -------------------------------
# 5. GRADIENT CURVE
# -------------------------------
plt.figure()
plt.plot(steps, grad_norms)
plt.xlabel("Steps")
plt.ylabel("Gradient Norm")
plt.title("Gradient Norm")
plt.grid()

plt.savefig("gradient_curve.png")
print("✅ Saved gradient_curve.png")

# -------------------------------
# 6. LEARNING RATE CURVE
# -------------------------------
plt.figure()
plt.plot(steps, learning_rates)
plt.xlabel("Steps")
plt.ylabel("Learning Rate")
plt.title("Learning Rate Schedule")
plt.grid()

plt.savefig("learning_rate_curve.png")
print("✅ Saved learning_rate_curve.png")

# -------------------------------
# 7. SHOW PLOTS (IMPORTANT)
# -------------------------------
plt.show()

print("🎉 DONE")