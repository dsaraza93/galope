-- Correct spelling while preserving categories, filters and uploaded media.
UPDATE products SET name=replace(replace(replace(name,'baquer','vaquer'),'Baquer','Vaquer'),'BAQUER','VAQUER') WHERE lower(name) LIKE '%baquer%';
UPDATE products SET cat=replace(replace(replace(cat,'baquer','vaquer'),'Baquer','Vaquer'),'BAQUER','VAQUER') WHERE lower(cat) LIKE '%baquer%';
UPDATE products SET categories=replace(replace(replace(categories,'baquer','vaquer'),'Baquer','Vaquer'),'BAQUER','VAQUER') WHERE lower(categories) LIKE '%baquer%';
UPDATE products SET description=replace(replace(replace(description,'baquer','vaquer'),'Baquer','Vaquer'),'BAQUER','VAQUER') WHERE lower(description) LIKE '%baquer%';
UPDATE products SET feats=replace(replace(replace(feats,'baquer','vaquer'),'Baquer','Vaquer'),'BAQUER','VAQUER') WHERE lower(feats) LIKE '%baquer%';
UPDATE slides SET title=replace(replace(replace(title,'baquer','vaquer'),'Baquer','Vaquer'),'BAQUER','VAQUER') WHERE lower(title) LIKE '%baquer%';
UPDATE slides SET tag=replace(replace(replace(tag,'baquer','vaquer'),'Baquer','Vaquer'),'BAQUER','VAQUER') WHERE lower(tag) LIKE '%baquer%';
UPDATE slides SET sub=replace(replace(replace(sub,'baquer','vaquer'),'Baquer','Vaquer'),'BAQUER','VAQUER') WHERE lower(sub) LIKE '%baquer%';
UPDATE slides SET cat=replace(replace(replace(cat,'baquer','vaquer'),'Baquer','Vaquer'),'BAQUER','VAQUER') WHERE lower(cat) LIKE '%baquer%';
UPDATE settings SET value=replace(replace(replace(value,'baquer','vaquer'),'Baquer','Vaquer'),'BAQUER','VAQUER') WHERE lower(value) LIKE '%baquer%';
