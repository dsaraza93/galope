# Mejoras de catálogo

- Las categorías del catálogo ahora se distribuyen en filas, sin scrollbar horizontal.
- Cada producto tiene una categoría principal (`cat`) y varias categorías asociadas (`categories`).
- Migración aditiva: los productos antiguos mantienen su categoría original.
- En el administrador se eligen varias categorías usando casillas.
- Un producto aparece una sola vez por filtro, incluso cuando pertenece a varias categorías.
- La selección de mundo y edad sigue independiente de la categoría.

Respalda `data/babycenter.db` antes de instalar en producción.
