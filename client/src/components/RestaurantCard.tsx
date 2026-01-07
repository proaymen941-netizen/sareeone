import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, MapPin } from 'lucide-react';
import type { Restaurant } from '@shared/schema';
import { getRestaurantStatus } from '../utils/restaurantHours';
import { useUiSettings } from '@/context/UiSettingsContext';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick: () => void;
}

export default function RestaurantCard({ restaurant, onClick }: RestaurantCardProps) {
  const status = getRestaurantStatus(restaurant);
  const { isFeatureEnabled } = useUiSettings();
  
  return (
    <Card 
      className={`group relative overflow-hidden rounded-xl border-0 bg-white dark:bg-gray-900 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer ${!status.isOpen ? 'opacity-80' : ''}`}
      onClick={onClick}
      data-testid={`restaurant-card-${restaurant.id}`}
    >
      <div className="flex h-32">
        {/* Image Container */}
        <div className="relative w-32 flex-shrink-0 overflow-hidden">
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          
          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <Badge 
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md border-0 ${
                status.statusColor === 'green' 
                  ? 'bg-emerald-500 text-white' 
                  : status.statusColor === 'yellow'
                  ? 'bg-amber-500 text-white'
                  : 'bg-red-500 text-white'
              }`}
            >
              {status.isOpen ? 'مفتوح' : 'مغلق'}
            </Badge>
          </div>
        </div>

        <CardContent className="flex-1 p-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-base text-gray-900 dark:text-white line-clamp-1">
                {restaurant.name}
              </h4>
              {restaurant.isFeatured && (
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {isFeatureEnabled('show_ratings') && (
                <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                  <Star className="h-3 w-3 fill-amber-500" />
                  <span>{restaurant.rating}</span>
                  <span className="text-gray-400 font-normal">({restaurant.reviewCount})</span>
                </div>
              )}
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{restaurant.deliveryTime}</span>
              </div>
            </div>

            {isFeatureEnabled('show_restaurant_description') && restaurant.description && (
              <p className="text-[11px] text-gray-400 line-clamp-1">
                {restaurant.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-50 dark:border-gray-800">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-orange-500" />
              <span className="text-xs font-bold text-orange-600">
                {restaurant.deliveryFee} ريال
              </span>
            </div>
            {isFeatureEnabled('show_minimum_order') && (
              <span className="text-[10px] text-gray-400">
                أدنى {restaurant.minimumOrder} ريال
              </span>
            )}
          </div>
        </CardContent>
      </div>

      {/* New Badge */}
      {restaurant.isNew && (
        <div className="absolute top-0 right-0">
          <div className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">
            جديد
          </div>
        </div>
      )}
    </Card>
  );
}
