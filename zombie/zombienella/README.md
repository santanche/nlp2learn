# Zombienella importunus

## Grammar

```
S -> s A | s B | s C.
A -> F | r F | r r F | r r e.
B -> l A.
C -> l l A.
F -> f e | p e.
```

## Derivations

```
1.  s f e
2.  s p e
3.  s r f e
4.  s r p e
5.  s r r f e
6.  s r r p e
7.  s r r e
8.  s l f e
9.  s l p e
10. s l r f e
11. s l r p e
12. s l r r f e
13. s l r r p e
14. s l r r e
15. s l l f e
16. s l l p e
17. s l l r f e
18. s l l r p e
19. s l l r r f e
20. s l l r r p e
21. s l l r r e
```

## Transition Probabilities

```
S → s A   1/3
S → s B   1/3
S → s C   1/3

A → F       1/4
A → r F     1/4
A → r r F   1/4
A → r r e   1/4

F → f e     1/2
F → p e     1/2

B → l A     1
C → l l A   1
```

