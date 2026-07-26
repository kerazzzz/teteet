import { mutation, type MutationCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { requireAdmin } from './lib/auth'
import { now } from './lib/time'

const DAY_MS = 24 * 60 * 60 * 1000

type SellerSeed = {
  clerkId: string
  email: string
  name: string
  phone: string
  address: string
}

type VehicleSeed = {
  sellerClerkId: string
  title: string
  make: string
  model: string
  year: number
  fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid'
  transmission: 'manual' | 'automatic'
  mileage: number
  engineCapacityCc?: number
  locationDistrict: string
  condition: 'used' | 'new'
  priceNpr: number
  description: string
  status:
    | 'live'
    | 'sold'
    | 'pending_approval'
    | 'draft'
    | 'rejected'
    | 'archived'
  listedDaysAgo: number
  conditionScore: number
  inspectorName: string
}

type BuyerSeed = SellerSeed

type VehicleReference = Pick<
  VehicleSeed,
  'make' | 'model' | 'year' | 'mileage' | 'locationDistrict'
>

type FinancingOptionSeed = {
  institutionName: string
  loanType: string
  minLoanAmountNpr: number
  maxLoanAmountNpr: number
  interestRateAnnual: number
  minTenureMonths: number
  maxTenureMonths: number
  processingFeeNpr: number
  eligibilityCriteria: string
  requiredDocuments: string
  contactDetails: string
  isActive: boolean
}

type NewsSeed = {
  title: string
  slug: string
  summary: string
  content: string
  status: 'draft' | 'published'
  createdDaysAgo: number
  publishedDaysAgo?: number
}

type TransactionSeed = {
  key: string
  buyerClerkId: string
  listing: VehicleReference
  status:
    | 'initiated'
    | 'payment_pending'
    | 'paid'
    | 'document_generated'
    | 'completed'
    | 'cancelled'
    | 'failed'
  paymentProvider?: 'esewa' | 'khalti'
  daysAgo: number
}

type ReviewSeed = {
  transactionKey: string
  fromClerkId: string
  rating: number
  comment?: string
  moderationStatus: 'visible' | 'flagged' | 'hidden'
  daysAgo: number
}

type ChatMessageSeed = {
  from: 'buyer' | 'seller'
  body: string
  readByRecipient: boolean
  daysAgo: number
}

type ChatSeed = {
  key: string
  buyerClerkId: string
  listing: VehicleReference
  messages: ChatMessageSeed[]
}

type SearchSeed = {
  buyerClerkId: string
  query: string
  filters: string
  daysAgo: number
}

type FinancingLeadSeed = {
  key: string
  buyerClerkId: string
  vehicle?: VehicleReference
  optionKey?: string
  requestedAmountNpr: number
  tenureMonths: number
  monthlyIncomeNpr: number
  fullName: string
  phone: string
  email: string
  notes: string
  status: 'new' | 'contacted' | 'approved' | 'rejected' | 'closed'
  daysAgo: number
}

type NotificationSeed = {
  key: string
  userClerkId: string
  type: string
  title: string
  body: string
  link?: string
  isRead: boolean
  daysAgo: number
}

type ComparisonSeed = {
  buyerClerkId: string
  vehicleRefs: VehicleReference[]
}

function nprLakh(value: number) {
  return Math.round(value * 100000)
}

function vehicleFingerprint(seed: Pick<VehicleSeed, 'make' | 'model' | 'year' | 'mileage' | 'locationDistrict'>) {
  return `${seed.make}|${seed.model}|${seed.year}|${seed.mileage}|${seed.locationDistrict}`
}

const SELLER_SEEDS: SellerSeed[] = [
  {
    clerkId: 'seed-nepal-seller-ktm-01',
    email: 'seller.ktm@titeet.demo',
    name: 'Sujan Karki',
    phone: '+977-9801000101',
    address: 'Naxal, Kathmandu',
  },
  {
    clerkId: 'seed-nepal-seller-ltp-01',
    email: 'seller.ltp@titeet.demo',
    name: 'Nisha Shrestha',
    phone: '+977-9801000102',
    address: 'Kupondole, Lalitpur',
  },
  {
    clerkId: 'seed-nepal-seller-pkr-01',
    email: 'seller.pkr@titeet.demo',
    name: 'Bikram Gurung',
    phone: '+977-9801000103',
    address: 'Lakeside, Pokhara',
  },
  {
    clerkId: 'seed-nepal-seller-ctw-01',
    email: 'seller.ctw@titeet.demo',
    name: 'Milan Adhikari',
    phone: '+977-9801000104',
    address: 'Bharatpur, Chitwan',
  },
  {
    clerkId: 'seed-nepal-seller-btl-01',
    email: 'seller.btl@titeet.demo',
    name: 'Ritesh Sharma',
    phone: '+977-9801000105',
    address: 'Traffic Chowk, Butwal',
  },
  {
    clerkId: 'seed-nepal-seller-btn-01',
    email: 'seller.btn@titeet.demo',
    name: 'Prabina Rai',
    phone: '+977-9801000106',
    address: 'Biratnagar-4, Morang',
  },
]

const BUYER_SEEDS: BuyerSeed[] = [
  {
    clerkId: 'seed-nepal-buyer-ktm-01',
    email: 'buyer.ktm@titeet.demo',
    name: 'Anish Thapa',
    phone: '+977-9818000101',
    address: 'Boudha, Kathmandu',
  },
  {
    clerkId: 'seed-nepal-buyer-ltp-01',
    email: 'buyer.ltp@titeet.demo',
    name: 'Rina Maharjan',
    phone: '+977-9818000102',
    address: 'Gwarko, Lalitpur',
  },
  {
    clerkId: 'seed-nepal-buyer-pkr-01',
    email: 'buyer.pkr@titeet.demo',
    name: 'Samir Bhandari',
    phone: '+977-9818000103',
    address: 'Prithvi Chowk, Pokhara',
  },
  {
    clerkId: 'seed-nepal-buyer-ctw-01',
    email: 'buyer.ctw@titeet.demo',
    name: 'Aayush Dhungana',
    phone: '+977-9818000104',
    address: 'Ratnanagar, Chitwan',
  },
  {
    clerkId: 'seed-nepal-buyer-btl-01',
    email: 'buyer.btl@titeet.demo',
    name: 'Sarita Poudel',
    phone: '+977-9818000105',
    address: 'Kalikanagar, Butwal',
  },
  {
    clerkId: 'seed-nepal-buyer-btn-01',
    email: 'buyer.btn@titeet.demo',
    name: 'Nabin Chaudhary',
    phone: '+977-9818000106',
    address: 'Biratnagar-3, Morang',
  },
]

const VEHICLE_SEEDS: VehicleSeed[] = [
  {
    sellerClerkId: 'seed-nepal-seller-ktm-01',
    title: 'Suzuki Swift GLX 2018 - Single owner',
    make: 'Suzuki',
    model: 'Swift',
    year: 2018,
    fuelType: 'petrol',
    transmission: 'automatic',
    mileage: 58000,
    engineCapacityCc: 1197,
    locationDistrict: 'Kathmandu',
    condition: 'used',
    priceNpr: nprLakh(31.5),
    description:
      'Well-maintained Kathmandu city car with complete servicing history, untouched chassis, and recently replaced tyres.',
    status: 'live',
    listedDaysAgo: 21,
    conditionScore: 84,
    inspectorName: 'Valley Auto Check',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ltp-01',
    title: 'Hyundai i20 Active 2017 - Good condition',
    make: 'Hyundai',
    model: 'i20 Active',
    year: 2017,
    fuelType: 'petrol',
    transmission: 'manual',
    mileage: 76000,
    engineCapacityCc: 1197,
    locationDistrict: 'Lalitpur',
    condition: 'used',
    priceNpr: nprLakh(27.8),
    description:
      'Urban crossover with smooth clutch, fresh insurance, and no major accident record.',
    status: 'live',
    listedDaysAgo: 18,
    conditionScore: 79,
    inspectorName: 'KTM Valley Inspector',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ktm-01',
    title: 'Kia Seltos HTX 2021 - Top trim',
    make: 'Kia',
    model: 'Seltos',
    year: 2021,
    fuelType: 'petrol',
    transmission: 'automatic',
    mileage: 38000,
    engineCapacityCc: 1497,
    locationDistrict: 'Kathmandu',
    condition: 'used',
    priceNpr: nprLakh(57.5),
    description:
      'Highway and city driven SUV with company service records, original paint, and premium interior.',
    status: 'live',
    listedDaysAgo: 12,
    conditionScore: 88,
    inspectorName: 'AutoSure Nepal',
  },
  {
    sellerClerkId: 'seed-nepal-seller-pkr-01',
    title: 'Hyundai Creta SX 2020 - Diesel automatic',
    make: 'Hyundai',
    model: 'Creta',
    year: 2020,
    fuelType: 'diesel',
    transmission: 'automatic',
    mileage: 52000,
    engineCapacityCc: 1493,
    locationDistrict: 'Pokhara',
    condition: 'used',
    priceNpr: nprLakh(62),
    description:
      'Pokhara-kept SUV with strong suspension, hill-route tested performance, and recently detailed interior.',
    status: 'live',
    listedDaysAgo: 26,
    conditionScore: 86,
    inspectorName: 'Pokhara Vehicle Lab',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ctw-01',
    title: 'Toyota Corolla Altis 2014 - Reliable sedan',
    make: 'Toyota',
    model: 'Corolla Altis',
    year: 2014,
    fuelType: 'petrol',
    transmission: 'automatic',
    mileage: 97000,
    engineCapacityCc: 1798,
    locationDistrict: 'Chitwan',
    condition: 'used',
    priceNpr: nprLakh(36.5),
    description:
      'Long-route proven sedan with stable engine performance and complete ownership documents.',
    status: 'live',
    listedDaysAgo: 34,
    conditionScore: 74,
    inspectorName: 'Narayani Auto Inspect',
  },
  {
    sellerClerkId: 'seed-nepal-seller-btl-01',
    title: 'Mahindra Scorpio S10 2018 - Rugged SUV',
    make: 'Mahindra',
    model: 'Scorpio',
    year: 2018,
    fuelType: 'diesel',
    transmission: 'manual',
    mileage: 69000,
    engineCapacityCc: 2179,
    locationDistrict: 'Butwal',
    condition: 'used',
    priceNpr: nprLakh(48),
    description:
      'Strong body-on-frame SUV with good torque, maintained suspension, and recent clutch overhaul.',
    status: 'live',
    listedDaysAgo: 30,
    conditionScore: 78,
    inspectorName: 'Lumbini Auto Care',
  },
  {
    sellerClerkId: 'seed-nepal-seller-btn-01',
    title: 'Ford EcoSport Titanium 2019',
    make: 'Ford',
    model: 'EcoSport',
    year: 2019,
    fuelType: 'petrol',
    transmission: 'manual',
    mileage: 61000,
    engineCapacityCc: 1497,
    locationDistrict: 'Biratnagar',
    condition: 'used',
    priceNpr: nprLakh(33.5),
    description:
      'Compact SUV with clean interior, good AC performance, and recent brake pad replacement.',
    status: 'live',
    listedDaysAgo: 19,
    conditionScore: 80,
    inspectorName: 'East Auto Verification',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ltp-01',
    title: 'Honda City VX 2016',
    make: 'Honda',
    model: 'City',
    year: 2016,
    fuelType: 'petrol',
    transmission: 'manual',
    mileage: 84000,
    engineCapacityCc: 1497,
    locationDistrict: 'Bhaktapur',
    condition: 'used',
    priceNpr: nprLakh(34),
    description:
      'Balanced family sedan with timely servicing, smooth steering response, and clean ownership transfer trail.',
    status: 'live',
    listedDaysAgo: 28,
    conditionScore: 77,
    inspectorName: 'Valley Auto Check',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ktm-01',
    title: 'Suzuki Baleno Delta 2020',
    make: 'Suzuki',
    model: 'Baleno',
    year: 2020,
    fuelType: 'petrol',
    transmission: 'automatic',
    mileage: 42000,
    engineCapacityCc: 1197,
    locationDistrict: 'Kathmandu',
    condition: 'used',
    priceNpr: nprLakh(39.5),
    description:
      'Fuel-efficient hatchback with excellent cabin condition and city-friendly turning radius.',
    status: 'live',
    listedDaysAgo: 16,
    conditionScore: 87,
    inspectorName: 'AutoSure Nepal',
  },
  {
    sellerClerkId: 'seed-nepal-seller-btn-01',
    title: 'Suzuki Dzire VXI 2019',
    make: 'Suzuki',
    model: 'Dzire',
    year: 2019,
    fuelType: 'petrol',
    transmission: 'automatic',
    mileage: 50000,
    engineCapacityCc: 1197,
    locationDistrict: 'Itahari',
    condition: 'used',
    priceNpr: nprLakh(32),
    description:
      'Practical sedan with low operating cost, strong mileage, and no pending tax dues.',
    status: 'live',
    listedDaysAgo: 25,
    conditionScore: 82,
    inspectorName: 'East Auto Verification',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ktm-01',
    title: 'Tata Nexon EV XZ+ 2022',
    make: 'Tata',
    model: 'Nexon EV',
    year: 2022,
    fuelType: 'electric',
    transmission: 'automatic',
    mileage: 26000,
    locationDistrict: 'Kathmandu',
    condition: 'used',
    priceNpr: nprLakh(49),
    description:
      'Popular EV with healthy battery diagnostics, home charger included, and documented range performance.',
    status: 'live',
    listedDaysAgo: 11,
    conditionScore: 89,
    inspectorName: 'EV Diagnostics Nepal',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ltp-01',
    title: 'MG ZS EV Exclusive 2021',
    make: 'MG',
    model: 'ZS EV',
    year: 2021,
    fuelType: 'electric',
    transmission: 'automatic',
    mileage: 31000,
    locationDistrict: 'Lalitpur',
    condition: 'used',
    priceNpr: nprLakh(59),
    description:
      'Feature-loaded EV SUV with original battery warranty support and smooth regenerative braking.',
    status: 'live',
    listedDaysAgo: 14,
    conditionScore: 86,
    inspectorName: 'EV Diagnostics Nepal',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ktm-01',
    title: 'BYD Atto 3 Superior 2023',
    make: 'BYD',
    model: 'Atto 3',
    year: 2023,
    fuelType: 'electric',
    transmission: 'automatic',
    mileage: 12000,
    locationDistrict: 'Kathmandu',
    condition: 'used',
    priceNpr: nprLakh(72),
    description:
      'Premium EV with low mileage, recent software updates, and strong battery health report.',
    status: 'live',
    listedDaysAgo: 9,
    conditionScore: 91,
    inspectorName: 'EV Diagnostics Nepal',
  },
  {
    sellerClerkId: 'seed-nepal-seller-pkr-01',
    title: 'Hyundai Kona Electric 2020',
    make: 'Hyundai',
    model: 'Kona Electric',
    year: 2020,
    fuelType: 'electric',
    transmission: 'automatic',
    mileage: 35000,
    locationDistrict: 'Pokhara',
    condition: 'used',
    priceNpr: nprLakh(54),
    description:
      'Long-range EV with verified charging history and stable battery temperature profile.',
    status: 'live',
    listedDaysAgo: 22,
    conditionScore: 84,
    inspectorName: 'Pokhara EV Lab',
  },
  {
    sellerClerkId: 'seed-nepal-seller-btn-01',
    title: 'Nissan Magnite Turbo CVT 2022',
    make: 'Nissan',
    model: 'Magnite',
    year: 2022,
    fuelType: 'petrol',
    transmission: 'automatic',
    mileage: 21000,
    engineCapacityCc: 999,
    locationDistrict: 'Birgunj',
    condition: 'used',
    priceNpr: nprLakh(34.5),
    description:
      'Compact turbo SUV with responsive CVT and complete service records from authorized center.',
    status: 'live',
    listedDaysAgo: 17,
    conditionScore: 85,
    inspectorName: 'Terai Auto Check',
  },
  {
    sellerClerkId: 'seed-nepal-seller-btl-01',
    title: 'Mahindra XUV300 W8 2021',
    make: 'Mahindra',
    model: 'XUV300',
    year: 2021,
    fuelType: 'diesel',
    transmission: 'manual',
    mileage: 33000,
    engineCapacityCc: 1497,
    locationDistrict: 'Butwal',
    condition: 'used',
    priceNpr: nprLakh(42),
    description:
      'Punchy diesel crossover with strong braking performance and stable highway ride.',
    status: 'live',
    listedDaysAgo: 20,
    conditionScore: 83,
    inspectorName: 'Lumbini Auto Care',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ctw-01',
    title: 'Toyota Hilux 2017 4x4',
    make: 'Toyota',
    model: 'Hilux',
    year: 2017,
    fuelType: 'diesel',
    transmission: 'manual',
    mileage: 88000,
    engineCapacityCc: 2393,
    locationDistrict: 'Chitwan',
    condition: 'used',
    priceNpr: nprLakh(74),
    description:
      'Powerful pickup with off-road capability, maintained drivetrain, and excellent cargo condition.',
    status: 'live',
    listedDaysAgo: 39,
    conditionScore: 76,
    inspectorName: 'Narayani Auto Inspect',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ctw-01',
    title: 'Isuzu D-Max V-Cross 2019',
    make: 'Isuzu',
    model: 'D-Max',
    year: 2019,
    fuelType: 'diesel',
    transmission: 'manual',
    mileage: 60000,
    engineCapacityCc: 2499,
    locationDistrict: 'Chitwan',
    condition: 'used',
    priceNpr: nprLakh(69),
    description:
      'Adventure-focused pickup with strong chassis integrity and recent suspension refresh.',
    status: 'live',
    listedDaysAgo: 27,
    conditionScore: 80,
    inspectorName: 'Narayani Auto Inspect',
  },
  {
    sellerClerkId: 'seed-nepal-seller-btl-01',
    title: 'Kia Sonet HTK 2022',
    make: 'Kia',
    model: 'Sonet',
    year: 2022,
    fuelType: 'petrol',
    transmission: 'manual',
    mileage: 19000,
    engineCapacityCc: 1197,
    locationDistrict: 'Dharan',
    condition: 'used',
    priceNpr: nprLakh(41),
    description:
      'Compact SUV with low mileage, clean cabin, and verified insurance continuity.',
    status: 'live',
    listedDaysAgo: 15,
    conditionScore: 88,
    inspectorName: 'East Auto Verification',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ltp-01',
    title: 'Hyundai Venue S 2021',
    make: 'Hyundai',
    model: 'Venue',
    year: 2021,
    fuelType: 'petrol',
    transmission: 'manual',
    mileage: 28000,
    engineCapacityCc: 1197,
    locationDistrict: 'Kathmandu',
    condition: 'used',
    priceNpr: nprLakh(41.5),
    description:
      'City-friendly compact SUV with smooth gearbox and up-to-date periodic maintenance.',
    status: 'live',
    listedDaysAgo: 23,
    conditionScore: 85,
    inspectorName: 'Valley Auto Check',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ktm-01',
    title: 'Honda CR-V 2013 AWD',
    make: 'Honda',
    model: 'CR-V',
    year: 2013,
    fuelType: 'petrol',
    transmission: 'automatic',
    mileage: 98000,
    engineCapacityCc: 2354,
    locationDistrict: 'Kathmandu',
    condition: 'used',
    priceNpr: nprLakh(52),
    description:
      'Spacious SUV with reliable AWD system, stable engine health, and family-use history.',
    status: 'sold',
    listedDaysAgo: 70,
    conditionScore: 73,
    inspectorName: 'AutoSure Nepal',
  },
  {
    sellerClerkId: 'seed-nepal-seller-btn-01',
    title: 'Renault Kwid RXT 2019',
    make: 'Renault',
    model: 'Kwid',
    year: 2019,
    fuelType: 'petrol',
    transmission: 'manual',
    mileage: 47000,
    engineCapacityCc: 999,
    locationDistrict: 'Janakpur',
    condition: 'used',
    priceNpr: nprLakh(22.5),
    description:
      'Affordable hatchback ideal for daily commute with low maintenance cost profile.',
    status: 'pending_approval',
    listedDaysAgo: 4,
    conditionScore: 81,
    inspectorName: 'Terai Auto Check',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ctw-01',
    title: 'Suzuki Alto 800 2017',
    make: 'Suzuki',
    model: 'Alto 800',
    year: 2017,
    fuelType: 'petrol',
    transmission: 'manual',
    mileage: 65000,
    engineCapacityCc: 796,
    locationDistrict: 'Nepalgunj',
    condition: 'used',
    priceNpr: nprLakh(18.2),
    description:
      'Entry-level budget hatchback with good fuel economy and complete registration transfer docs.',
    status: 'draft',
    listedDaysAgo: 2,
    conditionScore: 78,
    inspectorName: 'Banke Auto Hub',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ltp-01',
    title: 'Maruti Suzuki Ertiga VXI 2020',
    make: 'Maruti Suzuki',
    model: 'Ertiga',
    year: 2020,
    fuelType: 'petrol',
    transmission: 'manual',
    mileage: 45000,
    engineCapacityCc: 1462,
    locationDistrict: 'Kathmandu',
    condition: 'used',
    priceNpr: nprLakh(40.8),
    description:
      'Spacious 7-seater with complete service trail, ideal for large families and ride-share use.',
    status: 'pending_approval',
    listedDaysAgo: 3,
    conditionScore: 84,
    inspectorName: 'Valley Auto Check',
  },
  {
    sellerClerkId: 'seed-nepal-seller-pkr-01',
    title: 'Toyota Yaris G 2018',
    make: 'Toyota',
    model: 'Yaris',
    year: 2018,
    fuelType: 'petrol',
    transmission: 'automatic',
    mileage: 56000,
    engineCapacityCc: 1496,
    locationDistrict: 'Pokhara',
    condition: 'used',
    priceNpr: nprLakh(44.5),
    description:
      'Premium hatchback with comfort-focused suspension and reliable long-term performance.',
    status: 'pending_approval',
    listedDaysAgo: 6,
    conditionScore: 82,
    inspectorName: 'Pokhara Vehicle Lab',
  },
  {
    sellerClerkId: 'seed-nepal-seller-btl-01',
    title: 'Tata Tiago EV XT 2023',
    make: 'Tata',
    model: 'Tiago EV',
    year: 2023,
    fuelType: 'electric',
    transmission: 'automatic',
    mileage: 10000,
    locationDistrict: 'Butwal',
    condition: 'used',
    priceNpr: nprLakh(34.8),
    description:
      'Low-mileage EV hatchback with healthy battery report and recent software diagnostics.',
    status: 'pending_approval',
    listedDaysAgo: 5,
    conditionScore: 90,
    inspectorName: 'Lumbini Auto Care',
  },
  {
    sellerClerkId: 'seed-nepal-seller-btn-01',
    title: 'Honda Amaze S 2018',
    make: 'Honda',
    model: 'Amaze',
    year: 2018,
    fuelType: 'petrol',
    transmission: 'manual',
    mileage: 62000,
    engineCapacityCc: 1199,
    locationDistrict: 'Dharan',
    condition: 'used',
    priceNpr: nprLakh(29.8),
    description:
      'Practical compact sedan with smooth clutch and low maintenance ownership profile.',
    status: 'pending_approval',
    listedDaysAgo: 7,
    conditionScore: 80,
    inspectorName: 'East Auto Verification',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ctw-01',
    title: 'Nissan Sunny XL 2015',
    make: 'Nissan',
    model: 'Sunny',
    year: 2015,
    fuelType: 'petrol',
    transmission: 'manual',
    mileage: 91000,
    engineCapacityCc: 1498,
    locationDistrict: 'Chitwan',
    condition: 'used',
    priceNpr: nprLakh(26.2),
    description:
      'Comfort-oriented sedan in draft stage awaiting additional inspection photographs.',
    status: 'draft',
    listedDaysAgo: 1,
    conditionScore: 75,
    inspectorName: 'Narayani Auto Inspect',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ktm-01',
    title: 'Skoda Rapid Ambition 2016',
    make: 'Skoda',
    model: 'Rapid',
    year: 2016,
    fuelType: 'petrol',
    transmission: 'automatic',
    mileage: 73000,
    engineCapacityCc: 1598,
    locationDistrict: 'Kathmandu',
    condition: 'used',
    priceNpr: nprLakh(35.2),
    description:
      'Euro sedan currently rejected due to incomplete tax clearance paperwork.',
    status: 'rejected',
    listedDaysAgo: 9,
    conditionScore: 79,
    inspectorName: 'AutoSure Nepal',
  },
  {
    sellerClerkId: 'seed-nepal-seller-ltp-01',
    title: 'Hyundai Tucson 2012 4WD',
    make: 'Hyundai',
    model: 'Tucson',
    year: 2012,
    fuelType: 'diesel',
    transmission: 'automatic',
    mileage: 112000,
    engineCapacityCc: 1995,
    locationDistrict: 'Lalitpur',
    condition: 'used',
    priceNpr: nprLakh(28.5),
    description:
      'Older SUV moved to archive after owner paused sale to prioritize servicing.',
    status: 'archived',
    listedDaysAgo: 120,
    conditionScore: 68,
    inspectorName: 'KTM Valley Inspector',
  },
]

function vehicleRef(
  make: string,
  model: string,
  year: number,
  mileage: number,
  locationDistrict: string,
): VehicleReference {
  return {
    make,
    model,
    year,
    mileage,
    locationDistrict,
  }
}

function financingOptionKey(seed: {
  institutionName: string
  loanType: string
}) {
  return `${seed.institutionName}|${seed.loanType}`
}

const FINANCING_OPTION_SEEDS: FinancingOptionSeed[] = [
  {
    institutionName: 'Nepal Bank Limited',
    loanType: 'Auto Loan',
    minLoanAmountNpr: 500000,
    maxLoanAmountNpr: 8000000,
    interestRateAnnual: 10.5,
    minTenureMonths: 12,
    maxTenureMonths: 84,
    processingFeeNpr: 5000,
    eligibilityCriteria: 'Salaried or self-employed with verifiable income.',
    requiredDocuments: 'Citizenship, income proof, bank statement.',
    contactDetails: '+977-01-4000000',
    isActive: true,
  },
  {
    institutionName: 'Kumari Bank',
    loanType: 'Used Car Financing',
    minLoanAmountNpr: 300000,
    maxLoanAmountNpr: 6000000,
    interestRateAnnual: 11.25,
    minTenureMonths: 12,
    maxTenureMonths: 72,
    processingFeeNpr: 4500,
    eligibilityCriteria: 'Stable monthly income and credit history.',
    requiredDocuments: 'Citizenship, salary slips, tax clearance.',
    contactDetails: '+977-01-4100000',
    isActive: true,
  },
  {
    institutionName: 'Nabil Bank',
    loanType: 'EV Drive Loan',
    minLoanAmountNpr: 700000,
    maxLoanAmountNpr: 12000000,
    interestRateAnnual: 9.8,
    minTenureMonths: 18,
    maxTenureMonths: 96,
    processingFeeNpr: 6500,
    eligibilityCriteria: 'Minimum 2 years employment or stable business income.',
    requiredDocuments: 'Citizenship, PAN, bank statement, electricity bill.',
    contactDetails: '+977-01-4227181',
    isActive: true,
  },
  {
    institutionName: 'Siddhartha Bank',
    loanType: 'SUV Plus Loan',
    minLoanAmountNpr: 600000,
    maxLoanAmountNpr: 9500000,
    interestRateAnnual: 10.95,
    minTenureMonths: 12,
    maxTenureMonths: 84,
    processingFeeNpr: 5200,
    eligibilityCriteria: 'Debt-to-income ratio below internal lending cap.',
    requiredDocuments:
      'Citizenship, income certificate, 6-month bank statement, guarantor details.',
    contactDetails: '+977-01-5970157',
    isActive: true,
  },
  {
    institutionName: 'Global IME Bank',
    loanType: 'Green Mobility Loan',
    minLoanAmountNpr: 500000,
    maxLoanAmountNpr: 10000000,
    interestRateAnnual: 9.5,
    minTenureMonths: 12,
    maxTenureMonths: 90,
    processingFeeNpr: 4800,
    eligibilityCriteria: 'Vehicle must be electric or hybrid with import papers.',
    requiredDocuments: 'Citizenship, income source proof, tax clearance, quotation.',
    contactDetails: '+977-01-5970600',
    isActive: true,
  },
]

const NEWS_SEEDS: NewsSeed[] = [
  {
    title: 'Nepal Used Car Market: 2026 Outlook',
    slug: 'nepal-used-car-market-2026-outlook',
    summary: 'Demand rises as financing access improves in urban districts.',
    content:
      'The second-hand market continues to grow in Kathmandu Valley and Pokhara, driven by better digital discovery and transparent pricing tools.',
    status: 'published',
    createdDaysAgo: 34,
    publishedDaysAgo: 32,
  },
  {
    title: 'EVs in Pre-owned Listings Gain Traction',
    slug: 'ev-preowned-listings-nepal',
    summary: 'Electric vehicle listings are increasing in major hubs.',
    content:
      'Early-adopter EV resale supply is improving, with pricing still strongly dependent on battery health reports.',
    status: 'draft',
    createdDaysAgo: 7,
  },
  {
    title: 'Inspection Scorecards Become Key Buyer Filter',
    slug: 'inspection-scorecards-buyer-filter',
    summary: 'Listings with condition reports are converting faster.',
    content:
      'Platforms are seeing stronger buyer confidence when independent inspection summaries and scorecards are visible on listing pages.',
    status: 'published',
    createdDaysAgo: 18,
    publishedDaysAgo: 16,
  },
  {
    title: 'Bank Auto-Loan Approval Time Drops in Valley Branches',
    slug: 'bank-auto-loan-approval-time-drops',
    summary: 'Faster approvals are reducing drop-off during checkout.',
    content:
      'Several lenders report reduced document turn-around for salaried applicants, helping close transactions within the same week.',
    status: 'published',
    createdDaysAgo: 11,
    publishedDaysAgo: 10,
  },
  {
    title: 'Pending Listing Queue Peaks Ahead of Festival Season',
    slug: 'pending-listing-queue-festival-season',
    summary: 'Admin moderation backlogs rise with seasonal supply.',
    content:
      'As sellers prepare inventory before festival demand, moderation teams are prioritizing inspection completeness and ownership documents.',
    status: 'published',
    createdDaysAgo: 5,
    publishedDaysAgo: 4,
  },
  {
    title: 'How to Avoid Odometer Fraud in Pre-owned Purchases',
    slug: 'avoid-odometer-fraud-preowned-nepal',
    summary: 'Cross-checking service logs remains the most reliable tactic.',
    content:
      'Experts recommend comparing servicing history, emission records, and ECU diagnostics before finalizing a vehicle purchase.',
    status: 'published',
    createdDaysAgo: 22,
    publishedDaysAgo: 20,
  },
  {
    title: 'Cross-District Resale Trends: Terai vs Valley',
    slug: 'cross-district-resale-trends-terai-vs-valley',
    summary: 'Mileage and fuel mix differ sharply by region.',
    content:
      'Urban districts continue to show stronger compact-hatch demand, while diesel utility vehicles remain resilient in intercity corridors.',
    status: 'draft',
    createdDaysAgo: 2,
  },
  {
    title: 'Buyer Messaging Response Time Benchmark Released',
    slug: 'buyer-messaging-response-time-benchmark',
    summary: 'First-response speed now strongly correlates with conversion.',
    content:
      'Listings that receive a reply in under 15 minutes are materially more likely to move from inquiry to payment initiation.',
    status: 'published',
    createdDaysAgo: 3,
    publishedDaysAgo: 2,
  },
]

const TRANSACTION_SEEDS: TransactionSeed[] = [
  {
    key: 'swift-completed',
    buyerClerkId: 'seed-nepal-buyer-ltp-01',
    listing: vehicleRef('Suzuki', 'Swift', 2018, 58000, 'Kathmandu'),
    status: 'completed',
    paymentProvider: 'esewa',
    daysAgo: 14,
  },
  {
    key: 'seltos-paid',
    buyerClerkId: 'seed-nepal-buyer-pkr-01',
    listing: vehicleRef('Kia', 'Seltos', 2021, 38000, 'Kathmandu'),
    status: 'paid',
    paymentProvider: 'khalti',
    daysAgo: 9,
  },
  {
    key: 'creta-doc-generated',
    buyerClerkId: 'seed-nepal-buyer-ktm-01',
    listing: vehicleRef('Hyundai', 'Creta', 2020, 52000, 'Pokhara'),
    status: 'document_generated',
    paymentProvider: 'esewa',
    daysAgo: 12,
  },
  {
    key: 'baleno-payment-pending',
    buyerClerkId: 'seed-nepal-buyer-btn-01',
    listing: vehicleRef('Suzuki', 'Baleno', 2020, 42000, 'Kathmandu'),
    status: 'payment_pending',
    paymentProvider: 'khalti',
    daysAgo: 6,
  },
  {
    key: 'magnite-initiated',
    buyerClerkId: 'seed-nepal-buyer-ctw-01',
    listing: vehicleRef('Nissan', 'Magnite', 2022, 21000, 'Birgunj'),
    status: 'initiated',
    daysAgo: 2,
  },
  {
    key: 'venue-failed',
    buyerClerkId: 'seed-nepal-buyer-btl-01',
    listing: vehicleRef('Hyundai', 'Venue', 2021, 28000, 'Kathmandu'),
    status: 'failed',
    paymentProvider: 'khalti',
    daysAgo: 5,
  },
  {
    key: 'scorpio-completed',
    buyerClerkId: 'seed-nepal-buyer-pkr-01',
    listing: vehicleRef('Mahindra', 'Scorpio', 2018, 69000, 'Butwal'),
    status: 'completed',
    paymentProvider: 'esewa',
    daysAgo: 21,
  },
  {
    key: 'crv-completed',
    buyerClerkId: 'seed-nepal-buyer-ltp-01',
    listing: vehicleRef('Honda', 'CR-V', 2013, 98000, 'Kathmandu'),
    status: 'completed',
    paymentProvider: 'esewa',
    daysAgo: 46,
  },
  {
    key: 'dzire-cancelled',
    buyerClerkId: 'seed-nepal-buyer-ktm-01',
    listing: vehicleRef('Suzuki', 'Dzire', 2019, 50000, 'Itahari'),
    status: 'cancelled',
    paymentProvider: 'esewa',
    daysAgo: 8,
  },
]

const REVIEW_SEEDS: ReviewSeed[] = [
  {
    transactionKey: 'swift-completed',
    fromClerkId: 'seed-nepal-buyer-ltp-01',
    rating: 2,
    comment:
      'Seller responded quickly but odometer mismatch was discovered during transfer discussion.',
    moderationStatus: 'flagged',
    daysAgo: 12,
  },
  {
    transactionKey: 'swift-completed',
    fromClerkId: 'seed-nepal-seller-ktm-01',
    rating: 5,
    comment: 'Buyer was prompt with paperwork and payment confirmation.',
    moderationStatus: 'visible',
    daysAgo: 11,
  },
  {
    transactionKey: 'seltos-paid',
    fromClerkId: 'seed-nepal-buyer-pkr-01',
    rating: 4,
    comment: 'Vehicle condition matched listing details and test drive notes.',
    moderationStatus: 'visible',
    daysAgo: 7,
  },
  {
    transactionKey: 'creta-doc-generated',
    fromClerkId: 'seed-nepal-buyer-ktm-01',
    rating: 3,
    comment: 'Delivery was delayed due to missing insurance copy.',
    moderationStatus: 'hidden',
    daysAgo: 8,
  },
  {
    transactionKey: 'scorpio-completed',
    fromClerkId: 'seed-nepal-buyer-pkr-01',
    rating: 1,
    comment:
      'Post-sale service claim was disputed and requires admin follow-up.',
    moderationStatus: 'flagged',
    daysAgo: 18,
  },
  {
    transactionKey: 'crv-completed',
    fromClerkId: 'seed-nepal-seller-ktm-01',
    rating: 5,
    comment: 'Smooth closing and cooperative document handover.',
    moderationStatus: 'visible',
    daysAgo: 44,
  },
]

const CHAT_SEEDS: ChatSeed[] = [
  {
    key: 'swift-inquiry-thread',
    buyerClerkId: 'seed-nepal-buyer-ctw-01',
    listing: vehicleRef('Suzuki', 'Swift', 2018, 58000, 'Kathmandu'),
    messages: [
      {
        from: 'buyer',
        body: 'Hi, is the Swift still available this week?',
        readByRecipient: true,
        daysAgo: 3,
      },
      {
        from: 'seller',
        body: 'Yes, available. You can inspect in Naxal after 4 PM.',
        readByRecipient: true,
        daysAgo: 3,
      },
      {
        from: 'buyer',
        body: 'Great, please share recent service invoice photos.',
        readByRecipient: false,
        daysAgo: 2,
      },
    ],
  },
  {
    key: 'seltos-offer-thread',
    buyerClerkId: 'seed-nepal-buyer-btl-01',
    listing: vehicleRef('Kia', 'Seltos', 2021, 38000, 'Kathmandu'),
    messages: [
      {
        from: 'buyer',
        body: 'Can you negotiate if payment is immediate?',
        readByRecipient: true,
        daysAgo: 5,
      },
      {
        from: 'seller',
        body: 'A small adjustment is possible after final inspection.',
        readByRecipient: true,
        daysAgo: 5,
      },
      {
        from: 'seller',
        body: 'Battery and tyre reports are uploaded in the listing.',
        readByRecipient: false,
        daysAgo: 4,
      },
    ],
  },
  {
    key: 'hilux-route-check',
    buyerClerkId: 'seed-nepal-buyer-ktm-01',
    listing: vehicleRef('Toyota', 'Hilux', 2017, 88000, 'Chitwan'),
    messages: [
      {
        from: 'buyer',
        body: 'Has this Hilux been used for commercial off-road loads?',
        readByRecipient: true,
        daysAgo: 6,
      },
      {
        from: 'seller',
        body: 'Mostly personal use with occasional farm-road drives.',
        readByRecipient: true,
        daysAgo: 6,
      },
    ],
  },
  {
    key: 'ev-range-thread',
    buyerClerkId: 'seed-nepal-buyer-btn-01',
    listing: vehicleRef('MG', 'ZS EV', 2021, 31000, 'Lalitpur'),
    messages: [
      {
        from: 'buyer',
        body: 'What range are you getting in winter mornings?',
        readByRecipient: true,
        daysAgo: 2,
      },
      {
        from: 'seller',
        body: 'Around 290km practical range with city + ring-road mix.',
        readByRecipient: true,
        daysAgo: 2,
      },
      {
        from: 'buyer',
        body: 'Perfect, I want to schedule a weekend test drive.',
        readByRecipient: false,
        daysAgo: 1,
      },
    ],
  },
]

const SEARCH_SEEDS: SearchSeed[] = [
  {
    buyerClerkId: 'seed-nepal-buyer-ktm-01',
    query: 'electric suv',
    filters: '{"fuelType":"electric","minYear":2020,"sortBy":"newest"}',
    daysAgo: 1,
  },
  {
    buyerClerkId: 'seed-nepal-buyer-ktm-01',
    query: 'kathmandu automatic hatchback',
    filters: '{"locationDistrict":"Kathmandu","transmission":"automatic","maxPrice":4500000}',
    daysAgo: 4,
  },
  {
    buyerClerkId: 'seed-nepal-buyer-ltp-01',
    query: 'family suv under 60 lakh',
    filters: '{"minYear":2018,"maxPrice":6000000,"sortBy":"priceAsc"}',
    daysAgo: 2,
  },
  {
    buyerClerkId: 'seed-nepal-buyer-ltp-01',
    query: 'used honda in valley',
    filters: '{"make":"Honda","locationDistrict":"Kathmandu","sortBy":"yearDesc"}',
    daysAgo: 8,
  },
  {
    buyerClerkId: 'seed-nepal-buyer-pkr-01',
    query: 'diesel suv pokhara',
    filters: '{"locationDistrict":"Pokhara","fuelType":"diesel","sortBy":"newest"}',
    daysAgo: 3,
  },
  {
    buyerClerkId: 'seed-nepal-buyer-pkr-01',
    query: 'pickup 4x4',
    filters: '{"query":"pickup","minYear":2016,"sortBy":"priceDesc"}',
    daysAgo: 10,
  },
  {
    buyerClerkId: 'seed-nepal-buyer-ctw-01',
    query: 'compact suv birgunj',
    filters: '{"locationDistrict":"Birgunj","maxPrice":4000000}',
    daysAgo: 5,
  },
  {
    buyerClerkId: 'seed-nepal-buyer-btl-01',
    query: 'manual suv butwal',
    filters: '{"locationDistrict":"Butwal","transmission":"manual"}',
    daysAgo: 6,
  },
  {
    buyerClerkId: 'seed-nepal-buyer-btn-01',
    query: 'sedan itahari',
    filters: '{"locationDistrict":"Itahari","sortBy":"priceAsc"}',
    daysAgo: 3,
  },
]

const FINANCING_LEAD_SEEDS: FinancingLeadSeed[] = [
  {
    key: 'lead-new-swift',
    buyerClerkId: 'seed-nepal-buyer-ktm-01',
    vehicle: vehicleRef('Suzuki', 'Swift', 2018, 58000, 'Kathmandu'),
    optionKey: financingOptionKey({
      institutionName: 'Kumari Bank',
      loanType: 'Used Car Financing',
    }),
    requestedAmountNpr: 2000000,
    tenureMonths: 48,
    monthlyIncomeNpr: 95000,
    fullName: 'Anish Thapa',
    phone: '+977-9818000101',
    email: 'anish.thapa@example.com',
    notes: 'Need approval before month-end purchase.',
    status: 'new',
    daysAgo: 2,
  },
  {
    key: 'lead-contacted-ev',
    buyerClerkId: 'seed-nepal-buyer-btn-01',
    vehicle: vehicleRef('MG', 'ZS EV', 2021, 31000, 'Lalitpur'),
    optionKey: financingOptionKey({
      institutionName: 'Nabil Bank',
      loanType: 'EV Drive Loan',
    }),
    requestedAmountNpr: 4200000,
    tenureMonths: 72,
    monthlyIncomeNpr: 120000,
    fullName: 'Nabin Chaudhary',
    phone: '+977-9818000106',
    email: 'nabin.chaudhary@example.com',
    notes: 'Already shared salary slips and employer letter.',
    status: 'contacted',
    daysAgo: 9,
  },
  {
    key: 'lead-approved-scorpio',
    buyerClerkId: 'seed-nepal-buyer-pkr-01',
    vehicle: vehicleRef('Mahindra', 'Scorpio', 2018, 69000, 'Butwal'),
    optionKey: financingOptionKey({
      institutionName: 'Siddhartha Bank',
      loanType: 'SUV Plus Loan',
    }),
    requestedAmountNpr: 3100000,
    tenureMonths: 60,
    monthlyIncomeNpr: 135000,
    fullName: 'Samir Bhandari',
    phone: '+977-9818000103',
    email: 'samir.bhandari@example.com',
    notes: 'Approved with 20% down payment requirement.',
    status: 'approved',
    daysAgo: 16,
  },
  {
    key: 'lead-rejected-hilux',
    buyerClerkId: 'seed-nepal-buyer-ctw-01',
    vehicle: vehicleRef('Toyota', 'Hilux', 2017, 88000, 'Chitwan'),
    optionKey: financingOptionKey({
      institutionName: 'Nepal Bank Limited',
      loanType: 'Auto Loan',
    }),
    requestedAmountNpr: 5200000,
    tenureMonths: 72,
    monthlyIncomeNpr: 70000,
    fullName: 'Aayush Dhungana',
    phone: '+977-9818000104',
    email: 'aayush.dhungana@example.com',
    notes: 'Rejected due to high existing debt obligations.',
    status: 'rejected',
    daysAgo: 14,
  },
  {
    key: 'lead-closed-venue',
    buyerClerkId: 'seed-nepal-buyer-btl-01',
    vehicle: vehicleRef('Hyundai', 'Venue', 2021, 28000, 'Kathmandu'),
    optionKey: financingOptionKey({
      institutionName: 'Global IME Bank',
      loanType: 'Green Mobility Loan',
    }),
    requestedAmountNpr: 2600000,
    tenureMonths: 54,
    monthlyIncomeNpr: 102000,
    fullName: 'Sarita Poudel',
    phone: '+977-9818000105',
    email: 'sarita.poudel@example.com',
    notes: 'Customer closed lead after switching to direct payment.',
    status: 'closed',
    daysAgo: 20,
  },
]

const NOTIFICATION_SEEDS: NotificationSeed[] = [
  {
    key: 'notif-pending-ertiga',
    userClerkId: 'seed-nepal-seller-ltp-01',
    type: 'listing_pending',
    title: 'Listing submitted for review',
    body: 'Your Maruti Suzuki Ertiga listing is awaiting admin moderation.',
    link: '/seller/listings',
    isRead: false,
    daysAgo: 2,
  },
  {
    key: 'notif-listing-live-swift',
    userClerkId: 'seed-nepal-seller-ktm-01',
    type: 'listing_live',
    title: 'Listing went live',
    body: 'Your Suzuki Swift listing is now publicly visible.',
    link: '/seller/listings',
    isRead: true,
    daysAgo: 11,
  },
  {
    key: 'notif-new-chat-seltos',
    userClerkId: 'seed-nepal-seller-ktm-01',
    type: 'new_chat_message',
    title: 'New buyer inquiry',
    body: 'You received a new message on your Kia Seltos listing.',
    link: '/messages',
    isRead: false,
    daysAgo: 4,
  },
  {
    key: 'notif-payment-failed',
    userClerkId: 'seed-nepal-buyer-btl-01',
    type: 'payment_failed',
    title: 'Payment attempt failed',
    body: 'Your checkout for Hyundai Venue could not be completed.',
    link: '/transactions',
    isRead: false,
    daysAgo: 5,
  },
  {
    key: 'notif-financing-approved',
    userClerkId: 'seed-nepal-buyer-pkr-01',
    type: 'financing_status',
    title: 'Financing approved',
    body: 'Your SUV financing request has been approved by Siddhartha Bank.',
    link: '/financing',
    isRead: true,
    daysAgo: 15,
  },
]

const COMPARISON_SEEDS: ComparisonSeed[] = [
  {
    buyerClerkId: 'seed-nepal-buyer-ktm-01',
    vehicleRefs: [
      vehicleRef('Suzuki', 'Swift', 2018, 58000, 'Kathmandu'),
      vehicleRef('Suzuki', 'Baleno', 2020, 42000, 'Kathmandu'),
      vehicleRef('Hyundai', 'Venue', 2021, 28000, 'Kathmandu'),
    ],
  },
  {
    buyerClerkId: 'seed-nepal-buyer-pkr-01',
    vehicleRefs: [
      vehicleRef('Mahindra', 'Scorpio', 2018, 69000, 'Butwal'),
      vehicleRef('Toyota', 'Hilux', 2017, 88000, 'Chitwan'),
      vehicleRef('Isuzu', 'D-Max', 2019, 60000, 'Chitwan'),
    ],
  },
  {
    buyerClerkId: 'seed-nepal-buyer-ltp-01',
    vehicleRefs: [
      vehicleRef('Kia', 'Seltos', 2021, 38000, 'Kathmandu'),
      vehicleRef('Hyundai', 'Creta', 2020, 52000, 'Pokhara'),
      vehicleRef('MG', 'ZS EV', 2021, 31000, 'Lalitpur'),
    ],
  },
]

async function upsertMarketplaceUser(
  ctx: MutationCtx,
  seed: SellerSeed | BuyerSeed,
  role: 'seller' | 'buyer',
  currentTs: number,
) {
  const existing = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', seed.clerkId))
    .unique()

  if (existing) {
    await ctx.db.patch(existing._id, {
      name: seed.name,
      email: seed.email,
      phone: seed.phone,
      address: seed.address,
      role,
      isActive: true,
      updatedAt: currentTs,
    })
    return await ctx.db.get(existing._id)
  }

  const userId = await ctx.db.insert('users', {
    clerkId: seed.clerkId,
    email: seed.email,
    name: seed.name,
    role,
    phone: seed.phone,
    address: seed.address,
    isActive: true,
    createdAt: currentTs,
    updatedAt: currentTs,
  })

  return await ctx.db.get(userId)
}

async function seedFinancingOptions(ctx: MutationCtx, currentTs: number) {
  const existingOptions = await ctx.db.query('financingOptions').collect()
  const optionByKey = new Map(
    existingOptions.map((option) => [financingOptionKey(option), option]),
  )

  let inserted = 0
  let upserted = 0

  for (const seed of FINANCING_OPTION_SEEDS) {
    const existing = optionByKey.get(financingOptionKey(seed))
    if (existing) {
      await ctx.db.patch(existing._id, {
        institutionName: seed.institutionName,
        loanType: seed.loanType,
        minLoanAmountNpr: seed.minLoanAmountNpr,
        maxLoanAmountNpr: seed.maxLoanAmountNpr,
        interestRateAnnual: seed.interestRateAnnual,
        minTenureMonths: seed.minTenureMonths,
        maxTenureMonths: seed.maxTenureMonths,
        processingFeeNpr: seed.processingFeeNpr,
        eligibilityCriteria: seed.eligibilityCriteria,
        requiredDocuments: seed.requiredDocuments,
        contactDetails: seed.contactDetails,
        isActive: seed.isActive,
        updatedAt: currentTs,
      })
      upserted += 1
      continue
    }

    await ctx.db.insert('financingOptions', {
      institutionName: seed.institutionName,
      loanType: seed.loanType,
      minLoanAmountNpr: seed.minLoanAmountNpr,
      maxLoanAmountNpr: seed.maxLoanAmountNpr,
      interestRateAnnual: seed.interestRateAnnual,
      minTenureMonths: seed.minTenureMonths,
      maxTenureMonths: seed.maxTenureMonths,
      processingFeeNpr: seed.processingFeeNpr,
      eligibilityCriteria: seed.eligibilityCriteria,
      requiredDocuments: seed.requiredDocuments,
      contactDetails: seed.contactDetails,
      isActive: seed.isActive,
      createdAt: currentTs,
      updatedAt: currentTs,
    })
    inserted += 1
    upserted += 1
  }

  return {
    inserted,
    upserted,
    existingCount: existingOptions.length,
  }
}

async function seedNewsPosts(
  ctx: MutationCtx,
  adminId: Id<'users'>,
  currentTs: number,
) {
  const existingNewsCount = (await ctx.db.query('newsPosts').collect()).length

  let inserted = 0
  let upserted = 0

  for (const seed of NEWS_SEEDS) {
    const existing = await ctx.db
      .query('newsPosts')
      .withIndex('by_slug', (q) => q.eq('slug', seed.slug))
      .first()

    const createdAt = currentTs - seed.createdDaysAgo * DAY_MS
    const publishedAt =
      seed.status === 'published' && seed.publishedDaysAgo !== undefined
        ? currentTs - seed.publishedDaysAgo * DAY_MS
        : undefined

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: seed.title,
        slug: seed.slug,
        summary: seed.summary,
        content: seed.content,
        status: seed.status,
        createdBy: adminId,
        publishedAt,
        updatedAt: currentTs,
      })
      upserted += 1
      continue
    }

    await ctx.db.insert('newsPosts', {
      title: seed.title,
      slug: seed.slug,
      summary: seed.summary,
      content: seed.content,
      status: seed.status,
      createdBy: adminId,
      publishedAt,
      createdAt,
      updatedAt: currentTs,
    })
    inserted += 1
    upserted += 1
  }

  return {
    inserted,
    upserted,
    existingCount: existingNewsCount,
  }
}

export const seedDemoContent = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx)
    const currentTs = now()

    const financing = await seedFinancingOptions(ctx, currentTs)
    const news = await seedNewsPosts(ctx, admin._id, currentTs)

    return {
      seededOptions: financing.inserted > 0,
      seededNews: news.inserted > 0,
      financingOptionsUpserted: financing.upserted,
      financingOptionsInserted: financing.inserted,
      newsUpserted: news.upserted,
      newsInserted: news.inserted,
    }
  },
})

export const seedNepalVehicleMarketplace = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx)
    const currentTs = now()

    const financing = await seedFinancingOptions(ctx, currentTs)
    const news = await seedNewsPosts(ctx, admin._id, currentTs)

    const sellerByClerkId = new Map<string, Doc<'users'>>()
    for (const seller of SELLER_SEEDS) {
      const seededSeller = await upsertMarketplaceUser(
        ctx,
        seller,
        'seller',
        currentTs,
      )
      if (seededSeller) {
        sellerByClerkId.set(seller.clerkId, seededSeller)
      }
    }

    const buyerByClerkId = new Map<string, Doc<'users'>>()
    for (const buyer of BUYER_SEEDS) {
      const seededBuyer = await upsertMarketplaceUser(ctx, buyer, 'buyer', currentTs)
      if (seededBuyer) {
        buyerByClerkId.set(buyer.clerkId, seededBuyer)
      }
    }

    const userByClerkId = new Map<string, Doc<'users'>>([
      ...sellerByClerkId,
      ...buyerByClerkId,
    ])

    let vehiclesUpserted = 0
    let inspectionReportsUpserted = 0
    let priceEvaluationsUpserted = 0

    const sellerVehiclesCache = new Map<Id<'users'>, Doc<'vehicles'>[]>()
    const listingByFingerprint = new Map<string, Doc<'vehicles'>>()

    for (const [index, seed] of VEHICLE_SEEDS.entries()) {
      const seller = sellerByClerkId.get(seed.sellerClerkId)
      if (!seller) {
        continue
      }

      let sellerVehicles = sellerVehiclesCache.get(seller._id)
      if (!sellerVehicles) {
        sellerVehicles = await ctx.db
          .query('vehicles')
          .withIndex('by_seller_status', (q) => q.eq('sellerId', seller._id))
          .collect()
        sellerVehiclesCache.set(seller._id, sellerVehicles)
      }

      const createdAt = currentTs - seed.listedDaysAgo * DAY_MS
      const publishedAt =
        seed.status === 'live' || seed.status === 'sold' || seed.status === 'archived'
          ? createdAt + DAY_MS
          : undefined
      const soldAt =
        seed.status === 'sold'
          ? currentTs - Math.max(3, Math.floor(seed.listedDaysAgo / 3)) * DAY_MS
          : undefined
      const views = 120 + ((index * 37) % 260)
      const likes = Math.max(6, Math.round(views * 0.14))
      const fingerprint = vehicleFingerprint(seed)

      let listing = sellerVehicles.find(
        (candidate) => vehicleFingerprint(candidate) === fingerprint,
      )

      if (listing) {
        await ctx.db.patch(listing._id, {
          title: seed.title,
          make: seed.make,
          model: seed.model,
          year: seed.year,
          fuelType: seed.fuelType,
          transmission: seed.transmission,
          mileage: seed.mileage,
          engineCapacityCc: seed.engineCapacityCc,
          locationDistrict: seed.locationDistrict,
          condition: seed.condition,
          priceNpr: seed.priceNpr,
          description: seed.description,
          status: seed.status,
          publishedAt,
          soldAt,
          views,
          likes,
          updatedAt: currentTs,
        })
        const refreshed = await ctx.db.get(listing._id)
        if (refreshed) {
          listing = refreshed
        }
      } else {
        const listingId = await ctx.db.insert('vehicles', {
          sellerId: seller._id,
          title: seed.title,
          make: seed.make,
          model: seed.model,
          year: seed.year,
          fuelType: seed.fuelType,
          transmission: seed.transmission,
          mileage: seed.mileage,
          engineCapacityCc: seed.engineCapacityCc,
          locationDistrict: seed.locationDistrict,
          condition: seed.condition,
          priceNpr: seed.priceNpr,
          description: seed.description,
          status: seed.status,
          createdAt,
          updatedAt: currentTs,
          publishedAt,
          soldAt,
          views,
          likes,
        })
        const insertedListing = await ctx.db.get(listingId)
        if (insertedListing) {
          listing = insertedListing
          sellerVehicles.push(insertedListing)
        }
      }

      if (!listing) {
        continue
      }

      listingByFingerprint.set(fingerprint, listing)
      vehiclesUpserted += 1

      if (!listing.inspectionReportId) {
        const reportId = await ctx.db.insert('inspectionReports', {
          vehicleId: listing._id,
          reportNumber: `TVI-${seed.year}-${String(index + 1).padStart(4, '0')}`,
          summary: `Inspection completed: condition score ${seed.conditionScore}/100. Verified engine response, braking, suspension, and body alignment.`,
          conditionScore: seed.conditionScore,
          inspectorName: seed.inspectorName,
          issuedAt: currentTs - Math.max(1, Math.floor(seed.listedDaysAgo / 2)) * DAY_MS,
          createdAt: currentTs,
        })

        await ctx.db.patch(listing._id, {
          inspectionReportId: reportId,
          updatedAt: currentTs,
        })
        inspectionReportsUpserted += 1
      }

      const vehicleEvaluations = await ctx.db
        .query('priceEvaluations')
        .withIndex('by_vehicleId', (q) => q.eq('vehicleId', listing._id))
        .collect()

      const minPriceNpr = Math.round(seed.priceNpr * 0.9)
      const maxPriceNpr = Math.round(seed.priceNpr * 1.12)
      const confidence = Math.max(
        0.52,
        Math.min(
          0.92,
          (seed.fuelType === 'electric' ? 0.7 : 0.84) -
            (seed.mileage > 90000 ? 0.1 : 0) -
            (seed.status !== 'live' ? 0.05 : 0),
        ),
      )

      if (vehicleEvaluations.length === 0) {
        await ctx.db.insert('priceEvaluations', {
          vehicleId: listing._id,
          make: seed.make,
          model: seed.model,
          year: seed.year,
          condition: seed.condition,
          locationDistrict: seed.locationDistrict,
          averagePriceNpr: seed.priceNpr,
          minPriceNpr,
          maxPriceNpr,
          confidence,
          createdAt: currentTs,
        })
        priceEvaluationsUpserted += 1
      }
    }

    let transactionsUpserted = 0
    let paymentEventsUpserted = 0
    const transactionByKey = new Map<string, Doc<'transactions'>>()

    for (const seed of TRANSACTION_SEEDS) {
      const buyer = buyerByClerkId.get(seed.buyerClerkId)
      const listing = listingByFingerprint.get(vehicleFingerprint(seed.listing))

      if (!buyer || !listing || listing.sellerId === buyer._id) {
        continue
      }

      const createdAt = currentTs - seed.daysAgo * DAY_MS
      const paidAt =
        seed.status === 'paid' ||
        seed.status === 'document_generated' ||
        seed.status === 'completed'
          ? createdAt + 2 * 60 * 60 * 1000
          : undefined
      const paymentReference = `seed_tx_${seed.key}`
      const paymentIntentId = seed.paymentProvider
        ? `seed_intent_${seed.key}`
        : undefined

      const existing = await ctx.db
        .query('transactions')
        .withIndex('by_paymentReference', (q) =>
          q.eq('paymentReference', paymentReference),
        )
        .first()

      const transactionPatch = {
        vehicleId: listing._id,
        buyerId: buyer._id,
        sellerId: listing.sellerId,
        amountNpr: listing.priceNpr,
        status: seed.status,
        paymentProvider: seed.paymentProvider,
        paymentReference,
        paymentIntentId,
        paidAt,
        updatedAt: currentTs,
      }

      let transactionDoc: Doc<'transactions'> | null = null

      if (existing) {
        await ctx.db.patch(existing._id, transactionPatch)
        transactionDoc = await ctx.db.get(existing._id)
      } else {
        const transactionId = await ctx.db.insert('transactions', {
          ...transactionPatch,
          createdAt,
        })
        transactionDoc = await ctx.db.get(transactionId)
      }

      if (!transactionDoc) {
        continue
      }

      transactionsUpserted += 1
      transactionByKey.set(seed.key, transactionDoc)

      if (!seed.paymentProvider) {
        continue
      }

      const normalizedStatus =
        seed.status === 'failed'
          ? 'failed'
          : seed.status === 'paid' ||
              seed.status === 'document_generated' ||
              seed.status === 'completed'
            ? 'paid'
            : 'payment_pending'
      const eventId = `seed_event_${seed.key}`

      const existingEvent = await ctx.db
        .query('paymentEvents')
        .withIndex('by_provider_eventId', (q) =>
          q.eq('provider', seed.paymentProvider!).eq('eventId', eventId),
        )
        .first()

      if (existingEvent) {
        await ctx.db.patch(existingEvent._id, {
          transactionId: transactionDoc._id,
          normalizedStatus,
          rawPayload: JSON.stringify({
            seed: true,
            transactionKey: seed.key,
            status: seed.status,
          }),
          createdAt,
        })
      } else {
        await ctx.db.insert('paymentEvents', {
          transactionId: transactionDoc._id,
          provider: seed.paymentProvider,
          eventId,
          rawPayload: JSON.stringify({
            seed: true,
            transactionKey: seed.key,
            status: seed.status,
          }),
          normalizedStatus,
          createdAt,
        })
      }

      paymentEventsUpserted += 1
    }

    let reviewsUpserted = 0
    for (const seed of REVIEW_SEEDS) {
      const transaction = transactionByKey.get(seed.transactionKey)
      const fromUser = userByClerkId.get(seed.fromClerkId)

      if (!transaction || !fromUser) {
        continue
      }

      const isBuyer = transaction.buyerId === fromUser._id
      const isSeller = transaction.sellerId === fromUser._id
      if (!isBuyer && !isSeller) {
        continue
      }

      const toUserId = isBuyer ? transaction.sellerId : transaction.buyerId
      const createdAt = currentTs - seed.daysAgo * DAY_MS

      const existing = await ctx.db
        .query('reviews')
        .withIndex('by_transaction_from', (q) =>
          q.eq('transactionId', transaction._id).eq('fromUserId', fromUser._id),
        )
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, {
          listingId: transaction.vehicleId,
          toUserId,
          rating: seed.rating,
          comment: seed.comment,
          moderationStatus: seed.moderationStatus,
          createdAt,
        })
      } else {
        await ctx.db.insert('reviews', {
          transactionId: transaction._id,
          listingId: transaction.vehicleId,
          fromUserId: fromUser._id,
          toUserId,
          rating: seed.rating,
          comment: seed.comment,
          moderationStatus: seed.moderationStatus,
          createdAt,
        })
      }

      reviewsUpserted += 1
    }

    let chatsUpserted = 0
    let messagesUpserted = 0
    for (const seed of CHAT_SEEDS) {
      const buyer = buyerByClerkId.get(seed.buyerClerkId)
      const listing = listingByFingerprint.get(vehicleFingerprint(seed.listing))
      if (!buyer || !listing || buyer._id === listing.sellerId) {
        continue
      }

      let chat = await ctx.db
        .query('chats')
        .withIndex('by_listing_buyer_seller', (q) =>
          q
            .eq('listingId', listing._id)
            .eq('buyerId', buyer._id)
            .eq('sellerId', listing.sellerId),
        )
        .first()

      if (!chat) {
        const chatId = await ctx.db.insert('chats', {
          listingId: listing._id,
          buyerId: buyer._id,
          sellerId: listing.sellerId,
          lastMessageAt: currentTs,
          createdAt: currentTs,
          updatedAt: currentTs,
        })
        chat = await ctx.db.get(chatId)
      }

      if (!chat) {
        continue
      }

      chatsUpserted += 1

      const existingMessages = await ctx.db
        .query('messages')
        .withIndex('by_chat_createdAt', (q) => q.eq('chatId', chat._id))
        .collect()

      let latestMessageAt = chat.lastMessageAt

      for (const messageSeed of seed.messages) {
        const senderId =
          messageSeed.from === 'buyer' ? buyer._id : listing.sellerId
        const createdAt = currentTs - messageSeed.daysAgo * DAY_MS

        const existing = existingMessages.find(
          (message) =>
            message.senderId === senderId && message.body === messageSeed.body,
        )

        if (existing) {
          await ctx.db.patch(existing._id, {
            isReadByRecipient: messageSeed.readByRecipient,
            createdAt,
          })
        } else {
          await ctx.db.insert('messages', {
            chatId: chat._id,
            senderId,
            body: messageSeed.body,
            isReadByRecipient: messageSeed.readByRecipient,
            createdAt,
          })
        }

        latestMessageAt = Math.max(latestMessageAt, createdAt)
        messagesUpserted += 1
      }

      await ctx.db.patch(chat._id, {
        lastMessageAt: latestMessageAt,
        updatedAt: currentTs,
      })
    }

    let searchesUpserted = 0
    const searchHistoryByUser = new Map<Id<'users'>, Doc<'searchHistory'>[]>()
    for (const seed of SEARCH_SEEDS) {
      const buyer = buyerByClerkId.get(seed.buyerClerkId)
      if (!buyer) {
        continue
      }

      let searchRows = searchHistoryByUser.get(buyer._id)
      if (!searchRows) {
        searchRows = await ctx.db
          .query('searchHistory')
          .withIndex('by_user_createdAt', (q) => q.eq('userId', buyer._id))
          .collect()
        searchHistoryByUser.set(buyer._id, searchRows)
      }

      const createdAt = currentTs - seed.daysAgo * DAY_MS
      const existing = searchRows.find(
        (entry) => entry.query === seed.query && entry.filters === seed.filters,
      )

      if (existing) {
        await ctx.db.patch(existing._id, {
          createdAt,
        })
      } else {
        const rowId = await ctx.db.insert('searchHistory', {
          userId: buyer._id,
          query: seed.query,
          filters: seed.filters,
          createdAt,
        })
        const row = await ctx.db.get(rowId)
        if (row) {
          searchRows.push(row)
        }
      }

      searchesUpserted += 1
    }

    const financingOptions = await ctx.db.query('financingOptions').collect()
    const financingOptionIdByKey = new Map(
      financingOptions.map((option) => [financingOptionKey(option), option._id]),
    )

    let financingLeadsUpserted = 0
    const leadsByUser = new Map<Id<'users'>, Doc<'financingLeads'>[]>()
    for (const seed of FINANCING_LEAD_SEEDS) {
      const buyer = buyerByClerkId.get(seed.buyerClerkId)
      if (!buyer) {
        continue
      }

      let existingLeads = leadsByUser.get(buyer._id)
      if (!existingLeads) {
        existingLeads = await ctx.db
          .query('financingLeads')
          .withIndex('by_user_createdAt', (q) => q.eq('userId', buyer._id))
          .collect()
        leadsByUser.set(buyer._id, existingLeads)
      }

      const marker = `[seed:${seed.key}]`
      const notes = `${marker} ${seed.notes}`
      const createdAt = currentTs - seed.daysAgo * DAY_MS
      const optionId = seed.optionKey
        ? financingOptionIdByKey.get(seed.optionKey)
        : undefined
      const vehicleId = seed.vehicle
        ? listingByFingerprint.get(vehicleFingerprint(seed.vehicle))?._id
        : undefined

      const existing = existingLeads.find((lead) => lead.notes?.includes(marker))
      if (existing) {
        await ctx.db.patch(existing._id, {
          vehicleId,
          financingOptionId: optionId,
          requestedAmountNpr: seed.requestedAmountNpr,
          tenureMonths: seed.tenureMonths,
          monthlyIncomeNpr: seed.monthlyIncomeNpr,
          fullName: seed.fullName,
          phone: seed.phone,
          email: seed.email,
          notes,
          status: seed.status,
          createdAt,
          updatedAt: currentTs,
        })
      } else {
        const leadId = await ctx.db.insert('financingLeads', {
          userId: buyer._id,
          vehicleId,
          financingOptionId: optionId,
          requestedAmountNpr: seed.requestedAmountNpr,
          tenureMonths: seed.tenureMonths,
          monthlyIncomeNpr: seed.monthlyIncomeNpr,
          fullName: seed.fullName,
          phone: seed.phone,
          email: seed.email,
          notes,
          status: seed.status,
          createdAt,
          updatedAt: currentTs,
        })
        const lead = await ctx.db.get(leadId)
        if (lead) {
          existingLeads.push(lead)
        }
      }
      financingLeadsUpserted += 1
    }

    let comparisonsUpserted = 0
    for (const seed of COMPARISON_SEEDS) {
      const buyer = buyerByClerkId.get(seed.buyerClerkId)
      if (!buyer) {
        continue
      }

      const vehicleIds = Array.from(
        new Set(
          seed.vehicleRefs
            .map((ref) => listingByFingerprint.get(vehicleFingerprint(ref))?._id)
            .filter(Boolean),
        ),
      ) as Id<'vehicles'>[]

      if (vehicleIds.length === 0) {
        continue
      }

      const existing = await ctx.db
        .query('comparisons')
        .withIndex('by_userId', (q) => q.eq('userId', buyer._id))
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, {
          vehicleIds,
          updatedAt: currentTs,
        })
      } else {
        await ctx.db.insert('comparisons', {
          userId: buyer._id,
          vehicleIds,
          createdAt: currentTs,
          updatedAt: currentTs,
        })
      }
      comparisonsUpserted += 1
    }

    let notificationsUpserted = 0
    const existingNotifications = await ctx.db.query('notifications').collect()
    for (const seed of NOTIFICATION_SEEDS) {
      const user = userByClerkId.get(seed.userClerkId)
      if (!user) {
        continue
      }

      const link = seed.link ? `${seed.link}?seed=${seed.key}` : undefined
      const createdAt = currentTs - seed.daysAgo * DAY_MS

      const existing = existingNotifications.find(
        (notification) =>
          notification.userId === user._id &&
          notification.type === seed.type &&
          notification.title === seed.title &&
          notification.link === link,
      )

      if (existing) {
        await ctx.db.patch(existing._id, {
          body: seed.body,
          isRead: seed.isRead,
          createdAt,
        })
      } else {
        const notificationId = await ctx.db.insert('notifications', {
          userId: user._id,
          type: seed.type,
          title: seed.title,
          body: seed.body,
          link,
          isRead: seed.isRead,
          createdAt,
        })
        const inserted = await ctx.db.get(notificationId)
        if (inserted) {
          existingNotifications.push(inserted)
        }
      }

      notificationsUpserted += 1
    }

    return {
      sellersSeeded: sellerByClerkId.size,
      buyersSeeded: buyerByClerkId.size,
      financingOptionsUpserted: financing.upserted,
      financingOptionsInserted: financing.inserted,
      newsUpserted: news.upserted,
      newsInserted: news.inserted,
      vehiclesUpserted,
      inspectionReportsUpserted,
      priceEvaluationsUpserted,
      transactionsUpserted,
      paymentEventsUpserted,
      reviewsUpserted,
      chatsUpserted,
      messagesUpserted,
      searchesUpserted,
      financingLeadsUpserted,
      comparisonsUpserted,
      notificationsUpserted,
    }
  },
})
