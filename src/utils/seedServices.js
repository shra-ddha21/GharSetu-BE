import { ServiceCategory } from '../models/index.js';

const defaultCategories = [
  {
    categoryId: 'labour',
    name: 'Labour / Workforce (कामगार)',
    icon: 'HardHat',
    description: 'Find skilled and unskilled labour for your construction needs.',
    subcategories: [
      'General Labour (कामगार)',
      'Mason / Gavandi (गवंडी)',
      'Centering Labour (सेंटरिंग काम)',
      'Carpenter (सुतार)',
      'Painter (पेंटर)',
      'Electrician (इलेक्ट्रिशियन)',
      'Plumber (प्लंबर)',
      'Tile Fitter (टाइल)',
      'Fabricator (फेब्रिकेटर)',
      'Stone Worker'
    ]
  },
  {
    categoryId: 'professionals',
    name: 'Professionals / Consultants (व्यावसायिक सेवा)',
    icon: 'Briefcase',
    description: 'Hire experts for planning, designing, and surveying.',
    subcategories: [
      'Contractor (कॉन्ट्रॅक्टर)',
      'Architect (आर्किटेक्ट)',
      'Structural Designer',
      'Interior Designer',
      'Estimation & Costing Expert',
      'Surveyor (सर्वे)'
    ]
  },
  {
    categoryId: 'specialized',
    name: 'Specialized Services (विशेष सेवा)',
    icon: 'Wrench',
    description: 'Expert services for specific technical requirements.',
    subcategories: [
      'Waterproofing',
      'Core Cutting',
      'Pest Control',
      'CCTV Installation',
      'Borewell Service',
      'Solar Installation',
      'Repairing Services',
      'Kitchen Services (Modular/Repair)',
      'Ceiling Work (POP/False Ceiling)',
      'Railing Work',
      'Roofing Services'
    ]
  },
  {
    categoryId: 'equipment',
    name: 'Equipment & Heavy Services',
    icon: 'Truck',
    description: 'Rent earthmovers, tools, and heavy machinery.',
    subcategories: [
      'Earthmovers (JCB, Excavator)',
      'Equipment Rental',
      'Tools Rental'
    ]
  },
  {
    categoryId: 'materials',
    name: 'Construction Materials (साहित्य)',
    icon: 'Hammer',
    description: 'Source quality materials for your project.',
    subcategories: [
      'Cement',
      'Steel',
      'Bricks',
      'Sand',
      'Aggregate',
      'Murum & Construction Waste',
      'Concrete Articles',
      'Tiles / Paving Blocks',
      'Plumbing Materials',
      'Electrical Materials',
      'Paints',
      'Hardware',
      'Fabrication Materials',
      'Chemicals / Adhesives'
    ]
  },
  {
    categoryId: 'retail',
    name: 'Home Improvement & Retail (घरगुती साहित्य)',
    icon: 'Store',
    description: 'Furniture, decor, and retail items for your home.',
    subcategories: [
      'Furniture',
      'Plywood & Laminate',
      'Doors & Windows',
      'Home Décor',
      'Nursery (Plants & Landscaping)'
    ]
  },
  {
    categoryId: 'interior',
    name: 'Interior & Finishing Services',
    icon: 'Paintbrush',
    description: 'Complete your home with premium finishing services.',
    subcategories: [
      'Modular Kitchen',
      'Interior Execution',
      'Ceiling Design',
      'Furniture Work',
      'Railing & Finishing Work'
    ]
  }
];

export const seedServices = async () => {
  try {
    const count = await ServiceCategory.countDocuments();
    if (count === 0) {
      console.log('Seeding default service categories into database...');
      await ServiceCategory.insertMany(defaultCategories);
      console.log('Service categories seeded successfully!');
    }
  } catch (error) {
    console.error('Error seeding service categories:', error);
  }
};
