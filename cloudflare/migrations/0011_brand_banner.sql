-- Keep the original Galope cover as another editable slide in the same carousel.
INSERT INTO slides(pos,title,cta,cat,img,active,custom_image,mobile_image,media_fit)
SELECT COALESCE((SELECT MAX(pos)+1 FROM slides),0),'Vístete como se vive en el llano','Comprar ahora','','galope-brand',1,'/img/galope-brand-banner.svg','/img/galope-brand-banner-mobile.svg','artwork'
WHERE EXISTS(SELECT 1 FROM settings WHERE key='store') AND NOT EXISTS(SELECT 1 FROM slides WHERE img='galope-brand');
