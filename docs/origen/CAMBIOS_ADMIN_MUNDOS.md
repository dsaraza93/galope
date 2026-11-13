# Baby Center — Mundo y edad por producto

- Formulario del administrador: Mundo Bebé / Mundo Kids; edad mínima y máxima en **meses**.
- Los campos se guardan en la misma base de datos, con migración aditiva automática al iniciar el servidor.
- Los productos anteriores conservan su información; se asignan inicialmente a Mundo Bebé (0–36 meses), salvo categorías de juguetes explícitamente infantiles indicadas en la migración. **Revisar edades reales y mundo desde el administrador**.
- El selector existente en «Cada etapa tiene su magia» ahora filtra por el mundo asignado al producto, no por palabras en la categoría.
- Si una categoría contiene productos de ambos mundos, aparece en ambos filtros.
- La edad sirve como metadato del catálogo, no como una recomendación médica o garantía de seguridad: verificar el empaque y la edad recomendada por fabricante.
- Se preserva la estructura visual existente. Fotos, pedidos y ajustes existentes no se eliminan.
- Ejecución: `npm install` y `npm start`. Abrir `http://127.0.0.1:3000/#admin`.
- Antes de desplegar, respaldar `data/babycenter.db` del proyecto en uso. No reemplazar la carpeta `data` con una demo.
