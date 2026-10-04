# Equations

## Label Probability
### (Bernoulli Probability Mass Function - PMF)


$$p(y|x) = \hat{y}^y(1-\hat{y})^{1-y}$$

## Probability becomes Cross-Entropy Loss

```math
\begin{align*}
L_{CE}(\hat{y},y) &= -\ln{p(y|x)}
\\
&= -\ln\hat{y}^y(1-\hat{y})^{1-y}
\\
&= - \left[ y \ln\hat{y} + (1 - y) \ln(1 - \hat{y}) \right]
\end{align*}
```

## Loss Slope as Derivative

$$\frac{\partial L_{CE}(\hat{y},y)}{\partial w_j} = (\hat{y} - y) x_j
$$

## Decent: opposite direction to the slope with a learning rate η

```math
\begin{align*}
\Delta w_j &= -\eta \frac{\partial L_{CE}(\hat{y},y)}{\partial w_j}
\\
&= -\eta (\hat{y} - y) x_j
\end{align*}
```

## Learning: updating weights with the descent

```math
\begin{align*}
w^{t+1} &= w^t + \Delta w_j  
\\
&= w^t-\eta \frac{\partial L_{CE}(\hat{y},y)}{\partial w_j}
\\
&= w^t - \eta (\hat{y} - y) x_j
\end{align*}
```

## Summary

```math
\begin{align*}
p(y|x) &=\hat{y}^y(1-\hat{y})^{1-y}
\\
L_{CE}(\hat{y},y) &= -\ln{p(y|x)}
\\
&= -\ln\hat{y}^y(1-\hat{y})^{1-y}
\\
&= - \left[ y \ln\hat{y} + (1 - y) \ln(1 - \hat{y}) \right]
\\
\frac{\partial L_{CE}(\hat{y},y)}{\partial w_j} &= (\hat{y} - y) x_j
\\
\Delta w_j &= -\eta \frac{\partial L_{CE}(\hat{y},y)}{\partial w_j}
\\
&= -\eta (\hat{y} - y) x_j
\\
w^{t+1} &= w^t + \Delta w_j  
\\
&= w^t-\eta \frac{\partial L_{CE}(\hat{y},y)}{\partial w_j}
\\
&= w^t - \eta (\hat{y} - y) x_j
\end{align*}
```

## Emphasizing the $\sigma$ function

```math
\begin{align*}
\hat{y} &= \sigma(w \cdot x + b)
\\
L_{CE}(\hat{y},y) &= - \left[ y \ln \sigma(w \cdot x + b) + (1 - y) \ln(1 - \sigma(w \cdot x + b)) \right]
\\
\frac{\partial L_{CE}(\hat{y},y)}{\partial w_j} &= (\sigma(w \cdot x + b) - y) x_j
\\
\Delta w_j &= - \eta (\sigma(w \cdot x + b) - y) x_j
\\
w^{t+1} &= w^t - \eta (\sigma(w \cdot x + b) - y) x_j
\end{align*}
```