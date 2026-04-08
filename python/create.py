import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# Data based on 77.1% Truth Accuracy and 58/42 failure ratio
# Total samples: 1000
tn, fp = 321, 132  # TN: Hallucinations caught, FP: Overconfidence errors
fn, tp = 96, 451   # FN: Inference Drift, TP: Correctly Grounded Facts
conf_matrix = np.array([[tn, fp], [fn, tp]])

plt.figure(figsize=(8, 6))
sns.heatmap(conf_matrix, annot=True, fmt='d', cmap='Blues', cbar=False,
            xticklabels=['Predicted: Hallucinated', 'Predicted: Grounded'],
            yticklabels=['Actual: Hallucinated', 'Actual: Grounded'])

plt.title('TOE Truth Optimization Confusion Matrix', fontsize=14)
plt.ylabel('Actual Grounding Status', fontsize=12)
plt.xlabel('Model Prediction', fontsize=12)
plt.tight_layout()
plt.savefig('toe_confusion_matrix.png', dpi=300)