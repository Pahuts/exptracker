// Seed records extracted from "GaileNald - Wedding Budget Breakdown" CSV.
// These are planned line items with estimated amounts and no fixed date,
// so `date` is left empty ('') and `status` is 'Planned'.
// Category groups items by wedding phase.

const records = [];
const add = (category, description, amount) =>
  records.push({
    category,
    payer: 'Both',
    description,
    amount,
    date: '',
    status: 'Planned',
  });

// --- Pamamanhikan ----------------------------------------------------------
const PAMA = 'Wedding: Pamamanhikan';
add(PAMA, 'Venue', 0);
add(PAMA, 'Food', 5000);
add(PAMA, 'Presentation', 0);

// --- Pre Nup ---------------------------------------------------------------
const PRENUP = 'Wedding: Pre-Nup';
add(PRENUP, 'Venue/Accommodation', 10000);
add(PRENUP, 'Bride Outfits', 5000);
add(PRENUP, 'Groom Outfits', 5000);
add(PRENUP, 'Hair and Make Up', 3500);
add(PRENUP, 'Photography', 160000);
add(PRENUP, 'Videography', 80000);
add(PRENUP, 'Crew Meals', 3000);
add(PRENUP, 'Transportation', 3000);
add(PRENUP, 'Other Fees (e.g. Environmental Fee)', 1000);
add(PRENUP, 'Papers (Cenomar, PSA Birth Cert Cedula)', 1000);
add(PRENUP, 'Presider Fee', 3500);

// --- Wedding Day -----------------------------------------------------------
const WED = 'Wedding: Wedding Day';
add(WED, 'OTD Coordinator', 50000);
add(WED, 'Preparation Venue', 30000);
add(WED, 'Bride Hair and Make Up', 30000);
add(WED, 'Entourage Hair and Make Up', 20000);
add(WED, 'Bride Prep Gown', 5000);
add(WED, 'Bride Ceremony and Reception Gown', 25000);
add(WED, 'Bride Shoes and Slippers', 7000);
add(WED, 'Bride Veil', 3000);
add(WED, 'Bride Accessories (Earrings, Necklace, Hair Design)', 5000);
add(WED, 'Bride Perfume', 5000);
add(WED, "Bride's Bouquet", 3000);
add(WED, "Bride's Parents' Outfits + Gianne's", 10000);
add(WED, 'Bridesmaids Gowns', 0);
add(WED, 'Bridesmaids Bouquets', 2000);
add(WED, "Bridesmaids's Gifts", 20000);
add(WED, 'Groom Prep Outfit', 5000);
add(WED, 'Groom Ceremony and Reception Suit', 25000);
add(WED, 'Groom Shoes', 7000);
add(WED, 'Groom Accessories (Watch, Shades)', 5000);
add(WED, 'Groom Perfume', 5000);
add(WED, "Groom's Parents' Outfits + Mark's", 10000);
add(WED, "Groom's Buttonerie", 2000);
add(WED, 'Groomsmen Suits', 0);
add(WED, 'Groomsmen Gifts', 15000);
add(WED, "Sponsors' Gifts", 20000);
add(WED, "Sponsors' Corsage", 3000);
add(WED, "DIY - Flower Girls' Basket of White Hearts", 1000);
add(WED, 'Bridal Car', 0);
add(WED, 'Bridal Car Flowers', 1500);
add(WED, 'Rings', 50000);
add(WED, 'Ceremony Essentials (Bible, Arrhae, Cord, Ring Box)', 3000);
add(WED, 'DIY Design (Vow Cards, Invitation, Table Number, Seating Chart, Welcome Signage, Monogram)', 0);
add(WED, 'Printing Services (Vow Card, Invitation, Table Number, Seating Chart, Welcome Signage, Pre-Nup Photos)', 5000);
add(WED, 'DIY Fans, Ribbons/Bells/White Paper Hearts/Bubbles', 2500);
add(WED, 'Personalized Ribbon Service', 2000);
add(WED, 'Ceremony and Reception Venue', 200000);
add(WED, 'Venue Styling', 50000);
add(WED, 'Mirror Signage', 3000);
add(WED, 'Lights and Sounds, LED Wall', 30000);
add(WED, 'Photography', 0);
add(WED, 'Videography', 0);
add(WED, 'Roaming Photobooth', 15000);
add(WED, 'Caterer', 180000);
add(WED, 'Grazing Table', 20000);
add(WED, 'Pizza Bar', 10000);
add(WED, 'Potato Corner', 10000);
add(WED, 'Personalized Leather Goods Bar', 16500);
add(WED, 'Mobile Bar', 10000);
add(WED, 'Cake', 3000);
add(WED, 'Host', 15000);
add(WED, 'Singer', 15000);
add(WED, 'Crew Meals', 10000);
add(WED, 'Prizes for Reception Games', 5000);
add(WED, "Suppliers' Water and Snacks", 5000);

module.exports = records;
