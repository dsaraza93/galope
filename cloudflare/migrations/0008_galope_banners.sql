-- Repair inherited banner defaults without activating or replacing uploaded media.
UPDATE slides SET cta='Ver colección' WHERE trim(cta)='';
UPDATE slides SET title='Colección Galope' WHERE lower(title) LIKE '%babycenter%' OR lower(title) LIKE '%baby center%';
UPDATE slides SET tag='Galope' WHERE lower(tag) LIKE '%babycenter%' OR lower(tag) LIKE '%baby center%';
UPDATE slides SET sub='' WHERE lower(sub) LIKE '%babycenter%' OR lower(sub) LIKE '%baby center%';
UPDATE slides SET cta='Ver colección' WHERE lower(cta) LIKE '%babycenter%' OR lower(cta) LIKE '%baby center%';
UPDATE slides SET seal='Galope' WHERE lower(seal) LIKE '%babycenter%' OR lower(seal) LIKE '%baby center%';
UPDATE slides SET button_url='' WHERE lower(button_url) LIKE '%babycenter%' OR lower(button_url) LIKE '%baby center%';
UPDATE slides SET off='' WHERE lower(off) LIKE '%babycenter%' OR lower(off) LIKE '%baby center%';
