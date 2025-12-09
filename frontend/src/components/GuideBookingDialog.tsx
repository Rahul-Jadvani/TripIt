import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, DollarSign, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { WomenGuide } from '@/types';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

interface GuideBookingDialogProps {
  guideId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BookingFormData {
  destination: string;
  start_date: Date | undefined;
  end_date: Date | undefined;
  group_size: number;
  activity_type: string;
  special_requirements: string;
  emergency_contacts_shared: boolean;
  insurance_provided: boolean;
}

export function GuideBookingDialog({ guideId, open, onOpenChange }: GuideBookingDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<BookingFormData>({
    destination: '',
    start_date: undefined,
    end_date: undefined,
    group_size: 1,
    activity_type: '',
    special_requirements: '',
    emergency_contacts_shared: false,
    insurance_provided: false,
  });

  const { data: guide } = useQuery({
    queryKey: ['women-guide', guideId],
    queryFn: async () => {
      const response = await api.get(`/women-safety/guides/${guideId}`);
      return response.data.data as WomenGuide;
    },
    enabled: !!guideId && open,
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      if (!user) {
        throw new Error('Please login to book a guide');
      }

      const response = await api.post('/women-safety/bookings', {
        guide_id: guideId,
        destination: data.destination,
        start_date: data.start_date?.toISOString().split('T')[0],
        end_date: data.end_date?.toISOString().split('T')[0],
        group_size: data.group_size,
        activity_type: data.activity_type,
        special_requirements: data.special_requirements,
        emergency_contacts_shared: data.emergency_contacts_shared,
        insurance_provided: data.insurance_provided,
      });

      return response.data.data;
    },
    onSuccess: (data) => {
      setBookingId(data.id);
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['guide-bookings'] });
      toast.success('Booking request submitted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit booking request');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.destination.trim()) {
      toast.error('Please enter a destination');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      toast.error('Please select start and end dates');
      return;
    }
    if (formData.start_date >= formData.end_date) {
      toast.error('End date must be after start date');
      return;
    }
    if (formData.group_size < 1) {
      toast.error('Group size must be at least 1');
      return;
    }
    if (guide?.max_group_size && formData.group_size > guide.max_group_size) {
      toast.error(`Maximum group size is ${guide.max_group_size}`);
      return;
    }
    if (!formData.emergency_contacts_shared) {
      toast.error('You must agree to share emergency contacts');
      return;
    }

    bookingMutation.mutate(formData);
  };

  const calculateCost = () => {
    if (!formData.start_date || !formData.end_date || !guide?.hourly_rate_usd) {
      return 0;
    }

    const days = Math.ceil(
      (formData.end_date.getTime() - formData.start_date.getTime()) / (1000 * 60 * 60 * 24)
    );
    const hoursPerDay = 8; // Assume 8 hours per day
    const totalHours = days * hoursPerDay;
    return totalHours * guide.hourly_rate_usd;
  };

  const estimatedCost = calculateCost();

  const handleClose = () => {
    if (!bookingMutation.isPending) {
      onOpenChange(false);
      // Reset form after dialog closes
      setTimeout(() => {
        setFormData({
          destination: '',
          start_date: undefined,
          end_date: undefined,
          group_size: 1,
          activity_type: '',
          special_requirements: '',
          emergency_contacts_shared: false,
          insurance_provided: false,
        });
        setShowSuccess(false);
        setBookingId(null);
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {showSuccess ? (
          // Success State
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <DialogTitle className="text-2xl mb-2">Booking Request Submitted!</DialogTitle>
            <DialogDescription className="text-base mb-6">
              Your booking request has been sent to the guide. You'll receive a confirmation email
              shortly.
            </DialogDescription>

            <div className="bg-secondary/30 rounded-lg p-6 mb-6 text-left">
              <h4 className="font-semibold mb-3">Booking Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID:</span>
                  <span className="font-mono">{bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destination:</span>
                  <span className="font-semibold">{formData.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dates:</span>
                  <span>
                    {formData.start_date && format(formData.start_date, 'MMM dd, yyyy')} -{' '}
                    {formData.end_date && format(formData.end_date, 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Group Size:</span>
                  <span>{formData.group_size} people</span>
                </div>
                {estimatedCost > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-base font-semibold">
                      <span>Estimated Cost:</span>
                      <span className="text-primary">${estimatedCost.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={handleClose} className="w-full" size="lg">
                Done
              </Button>
              <p className="text-xs text-muted-foreground">
                The guide will contact you within 24-48 hours to confirm the booking.
              </p>
            </div>
          </div>
        ) : (
          // Booking Form
          <>
            <DialogHeader>
              <DialogTitle>Book {guide?.traveler?.displayName || 'This Guide'}</DialogTitle>
              <DialogDescription>
                Fill in the details below to request a booking. The guide will review and confirm
                your request.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Destination */}
              <div className="space-y-2">
                <Label htmlFor="destination">
                  Destination <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="destination"
                  placeholder="e.g., Jaipur, Rajasthan"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  required
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.start_date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? (
                          format(formData.start_date, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.start_date}
                        onSelect={(date) => setFormData({ ...formData, start_date: date })}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>
                    End Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.end_date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_date ? (
                          format(formData.end_date, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.end_date}
                        onSelect={(date) => setFormData({ ...formData, end_date: date })}
                        disabled={(date) =>
                          date < new Date() || (formData.start_date ? date < formData.start_date : false)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Group Size and Activity Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="group_size">
                    Group Size <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="group_size"
                    type="number"
                    min="1"
                    max={guide?.max_group_size || 20}
                    value={formData.group_size}
                    onChange={(e) =>
                      setFormData({ ...formData, group_size: parseInt(e.target.value) || 1 })
                    }
                    required
                  />
                  {guide?.max_group_size && (
                    <p className="text-xs text-muted-foreground">
                      Max group size: {guide.max_group_size}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity_type">Activity Type</Label>
                  <Input
                    id="activity_type"
                    placeholder="e.g., trekking, sightseeing"
                    value={formData.activity_type}
                    onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                  />
                </div>
              </div>

              {/* Special Requirements */}
              <div className="space-y-2">
                <Label htmlFor="special_requirements">Special Requirements</Label>
                <Textarea
                  id="special_requirements"
                  placeholder="Any dietary restrictions, accessibility needs, or specific requests..."
                  value={formData.special_requirements}
                  onChange={(e) =>
                    setFormData({ ...formData, special_requirements: e.target.value })
                  }
                  rows={4}
                />
              </div>

              {/* Cost Estimate */}
              {estimatedCost > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Estimated Cost</div>
                      <div className="text-xs text-muted-foreground">
                        Based on ~8 hours/day × ${guide?.hourly_rate_usd}/hour
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-2xl font-bold text-primary">
                      <DollarSign className="h-6 w-6" />
                      {estimatedCost.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Checkboxes */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="emergency_contacts"
                    checked={formData.emergency_contacts_shared}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, emergency_contacts_shared: checked === true })
                    }
                    required
                  />
                  <div className="space-y-1 leading-none">
                    <label
                      htmlFor="emergency_contacts"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to share my emergency contact details{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Required for your safety during the trip
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="insurance"
                    checked={formData.insurance_provided}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, insurance_provided: checked === true })
                    }
                  />
                  <div className="space-y-1 leading-none">
                    <label
                      htmlFor="insurance"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I have travel insurance
                    </label>
                    <p className="text-xs text-muted-foreground">Highly recommended for all trips</p>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={bookingMutation.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={bookingMutation.isPending || !user}
                  className="flex-1 bg-primary hover:bg-primary/90 text-black font-semibold"
                >
                  {bookingMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : !user ? (
                    'Login to Book'
                  ) : (
                    'Submit Booking Request'
                  )}
                </Button>
              </div>

              {!user && (
                <p className="text-xs text-center text-muted-foreground">
                  Please login to submit a booking request
                </p>
              )}
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
