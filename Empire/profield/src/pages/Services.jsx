import { PageHeader, Card } from '../components/Shared'
import { Wrench, Zap, Droplets, Home, TreePine, Wind } from 'lucide-react'

const categories = [
  { name: 'Plumbing', icon: Droplets, services: ['Leak Repair', 'Pipe Installation', 'Drain Cleaning', 'Water Heater'] },
  { name: 'Electrical', icon: Zap, services: ['Wiring', 'Panel Upgrade', 'Lighting', 'Outlets & Switches'] },
  { name: 'HVAC', icon: Wind, services: ['AC Repair', 'Heating', 'Duct Cleaning', 'Maintenance'] },
  { name: 'General', icon: Home, services: ['Drywall', 'Painting', 'Flooring', 'Doors & Windows'] },
  { name: 'Outdoor', icon: TreePine, services: ['Landscaping', 'Fencing', 'Decking', 'Pressure Washing'] },
  { name: 'Other', icon: Wrench, services: ['Consultation', 'Inspection', 'Emergency', 'Custom'] },
]

export default function Services() {
  return (
    <div className="space-y-6">
      <PageHeader title="Services" description="Manage your service offerings" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <Card key={cat.name} className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <cat.icon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold">{cat.name}</h3>
            </div>
            <div className="space-y-1">
              {cat.services.map(s => (
                <div key={s} className="text-sm text-gray-600 px-2 py-1 bg-gray-50 rounded">{s}</div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
