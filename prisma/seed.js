require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log('🌱 Starting seed...');

  await prisma.kupon.deleteMany();
  console.log('🗑️  Cleared existing data');

  const namaList = [
    'Ahmad Fauzi', 'Budi Santoso', 'Citra Dewi', 'Dian Prasetyo',
    'Eka Putri', 'Fajar Nugroho', 'Gita Maharani', 'Hendra Wijaya',
    'Indah Sari', 'Joko Susilo', 'Kartini Rahayu', 'Lukman Hakim',
    'Maya Anggraini', 'Nanda Permata', 'Omar Abdullah', 'Putri Handayani',
    'Qori Ramadhan', 'Rizky Maulana', 'Siti Nurhaliza', 'Teguh Prasetya',
  ];

  const terdaftarKupons = namaList.map((nama, index) => ({
    kode: `KPN${String(index + 1).padStart(3, '0')}`,
    nomor: String(index + 1).padStart(3, '0'),
    nama,
    tipe: 'terdaftar',
    status: index < 5 ? 'sudah' : 'belum',
    used_at: index < 5 ? new Date(Date.now() - Math.random() * 86400000) : null,
  }));

  const extraKupons = Array.from({ length: 10 }, (_, index) => ({
    kode: `EX${String(index + 1).padStart(3, '0')}`,
    nomor: `E${String(index + 1).padStart(3, '0')}`,
    nama: 'EXTRA',
    tipe: 'extra',
    status: index < 2 ? 'sudah' : 'belum',
    used_at: index < 2 ? new Date(Date.now() - Math.random() * 86400000) : null,
  }));

  const allKupons = [...terdaftarKupons, ...extraKupons];

  for (const kupon of allKupons) {
    await prisma.kupon.create({ data: kupon });
  }

  console.log(`✅ Seeded ${terdaftarKupons.length} kupon terdaftar`);
  console.log(`✅ Seeded ${extraKupons.length} kupon extra`);
  console.log(`🎉 Seed completed! Total: ${allKupons.length} kupons`);
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
