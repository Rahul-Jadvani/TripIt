"""
TRIP Token Economy System

Manages the off-chain TRIP token rewards and spending for TripIt.
TRIP tokens are earned through contributions and can be spent on premium features.

Earn Rates:
- Verified itinerary: 50 TRIP
- Travel intel: 10 TRIP
- Safety rating: 5 TRIP
- Snap post: 2 TRIP
- Emergency alert response: 20 TRIP

Spend Rates:
- Boost visibility: 10 TRIP
- Premium intel access: 5 TRIP
- Private group access: 50 TRIP
- Premium intro: 20 TRIP
- Tip creator: Variable (user-defined)
"""

from datetime import datetime
from typing import Optional, Dict, Any
from models import db
from models.traveler import Traveler
from flask import current_app


class TripEconomy:
    """
    Manages TRIP token transactions for travelers.

    This is an off-chain token system stored in the travelers table.
    Future enhancement: Move to on-chain ERC-20 token on Base.
    """

    # Transaction Types
    class TransactionType:
        # Earn types
        VERIFIED_ITINERARY = 'verified_itinerary'
        TRAVEL_INTEL = 'travel_intel'
        SAFETY_RATING = 'safety_rating'
        SNAP_POST = 'snap_post'
        EMERGENCY_RESPONSE = 'emergency_response'

        # Spend types
        BOOST_VISIBILITY = 'boost_visibility'
        PREMIUM_INTEL = 'premium_intel'
        PRIVATE_GROUP = 'private_group'
        PREMIUM_INTRO = 'premium_intro'
        TIP_CREATOR = 'tip_creator'

    # Earn rates (how much TRIP is awarded)
    EARN_RATES = {
        TransactionType.VERIFIED_ITINERARY: 50,
        TransactionType.TRAVEL_INTEL: 10,
        TransactionType.SAFETY_RATING: 5,
        TransactionType.SNAP_POST: 2,
        TransactionType.EMERGENCY_RESPONSE: 20,
    }

    # Spend rates (how much TRIP is deducted)
    SPEND_RATES = {
        TransactionType.BOOST_VISIBILITY: 10,
        TransactionType.PREMIUM_INTEL: 5,
        TransactionType.PRIVATE_GROUP: 50,
        TransactionType.PREMIUM_INTRO: 20,
        # TIP_CREATOR is variable, set by user
    }

    @staticmethod
    def award_trip(
        traveler_id: str,
        transaction_type: str,
        amount: Optional[int] = None,
        reference_id: Optional[str] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Award TRIP tokens to a traveler.

        Args:
            traveler_id: ID of the traveler
            transaction_type: Type of transaction (must be in EARN_RATES)
            amount: Optional custom amount (uses EARN_RATES if None)
            reference_id: Optional reference to related object (itinerary_id, post_id, etc.)
            description: Optional description for the transaction

        Returns:
            dict: {'success': bool, 'new_balance': int, 'amount_awarded': int, 'message': str}
        """
        try:
            traveler = Traveler.query.get(traveler_id)
            if not traveler:
                return {
                    'success': False,
                    'error': 'Traveler not found',
                    'new_balance': 0,
                    'amount_awarded': 0
                }

            # Get amount from rates or use custom amount
            if amount is None:
                if transaction_type not in TripEconomy.EARN_RATES:
                    return {
                        'success': False,
                        'error': f'Unknown transaction type: {transaction_type}',
                        'new_balance': traveler.trip_token_balance or 0,
                        'amount_awarded': 0
                    }
                amount = TripEconomy.EARN_RATES[transaction_type]

            # Update balances
            if traveler.trip_token_balance is None:
                traveler.trip_token_balance = 0
            if traveler.trip_earnings_total is None:
                traveler.trip_earnings_total = 0

            traveler.trip_token_balance += amount
            traveler.trip_earnings_total += amount

            db.session.commit()

            # Log the transaction
            current_app.logger.info(
                f"TRIP AWARD: {amount} TRIP to traveler {traveler_id} "
                f"(type: {transaction_type}, ref: {reference_id})"
            )

            return {
                'success': True,
                'new_balance': traveler.trip_token_balance,
                'amount_awarded': amount,
                'message': f'Awarded {amount} TRIP tokens!',
                'transaction_type': transaction_type,
                'reference_id': reference_id
            }

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error awarding TRIP: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'new_balance': 0,
                'amount_awarded': 0
            }

    @staticmethod
    def spend_trip(
        traveler_id: str,
        transaction_type: str,
        amount: Optional[int] = None,
        reference_id: Optional[str] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Spend TRIP tokens from a traveler's balance.

        Args:
            traveler_id: ID of the traveler
            transaction_type: Type of transaction (must be in SPEND_RATES or TIP_CREATOR)
            amount: Required for TIP_CREATOR, optional for others (uses SPEND_RATES)
            reference_id: Optional reference to related object
            description: Optional description for the transaction

        Returns:
            dict: {'success': bool, 'new_balance': int, 'amount_spent': int, 'message': str}
        """
        try:
            traveler = Traveler.query.get(traveler_id)
            if not traveler:
                return {
                    'success': False,
                    'error': 'Traveler not found',
                    'new_balance': 0,
                    'amount_spent': 0
                }

            # Get amount from rates or use custom amount
            if amount is None:
                if transaction_type not in TripEconomy.SPEND_RATES:
                    return {
                        'success': False,
                        'error': f'Amount required for transaction type: {transaction_type}',
                        'new_balance': traveler.trip_token_balance or 0,
                        'amount_spent': 0
                    }
                amount = TripEconomy.SPEND_RATES[transaction_type]

            # Check if traveler has sufficient balance
            current_balance = traveler.trip_token_balance or 0
            if current_balance < amount:
                return {
                    'success': False,
                    'error': f'Insufficient TRIP balance. Required: {amount}, Available: {current_balance}',
                    'new_balance': current_balance,
                    'amount_spent': 0
                }

            # Update balances
            if traveler.trip_spent_total is None:
                traveler.trip_spent_total = 0

            traveler.trip_token_balance -= amount
            traveler.trip_spent_total += amount

            db.session.commit()

            # Log the transaction
            current_app.logger.info(
                f"TRIP SPEND: {amount} TRIP from traveler {traveler_id} "
                f"(type: {transaction_type}, ref: {reference_id})"
            )

            return {
                'success': True,
                'new_balance': traveler.trip_token_balance,
                'amount_spent': amount,
                'message': f'Spent {amount} TRIP tokens!',
                'transaction_type': transaction_type,
                'reference_id': reference_id
            }

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error spending TRIP: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'new_balance': 0,
                'amount_spent': 0
            }

    @staticmethod
    def transfer_trip(
        from_traveler_id: str,
        to_traveler_id: str,
        amount: int,
        transaction_type: str = TransactionType.TIP_CREATOR,
        reference_id: Optional[str] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transfer TRIP tokens from one traveler to another.
        Used for tipping creators.

        Args:
            from_traveler_id: ID of the sender
            to_traveler_id: ID of the recipient
            amount: Amount of TRIP to transfer
            transaction_type: Type of transaction (default: TIP_CREATOR)
            reference_id: Optional reference to related object
            description: Optional description

        Returns:
            dict: {'success': bool, 'sender_balance': int, 'recipient_balance': int, 'amount': int}
        """
        try:
            # Validate travelers exist
            sender = Traveler.query.get(from_traveler_id)
            recipient = Traveler.query.get(to_traveler_id)

            if not sender:
                return {'success': False, 'error': 'Sender not found'}
            if not recipient:
                return {'success': False, 'error': 'Recipient not found'}

            if amount <= 0:
                return {'success': False, 'error': 'Amount must be positive'}

            # Spend from sender
            spend_result = TripEconomy.spend_trip(
                from_traveler_id,
                transaction_type,
                amount,
                reference_id,
                f"Transfer to {to_traveler_id}: {description or ''}"
            )

            if not spend_result['success']:
                return spend_result

            # Award to recipient
            award_result = TripEconomy.award_trip(
                to_traveler_id,
                transaction_type,
                amount,
                reference_id,
                f"Transfer from {from_traveler_id}: {description or ''}"
            )

            if not award_result['success']:
                # Rollback sender's spend
                db.session.rollback()
                return {'success': False, 'error': 'Failed to award to recipient'}

            db.session.commit()

            current_app.logger.info(
                f"TRIP TRANSFER: {amount} TRIP from {from_traveler_id} to {to_traveler_id}"
            )

            return {
                'success': True,
                'sender_balance': spend_result['new_balance'],
                'recipient_balance': award_result['new_balance'],
                'amount': amount,
                'message': f'Transferred {amount} TRIP tokens successfully!'
            }

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error transferring TRIP: {str(e)}")
            return {'success': False, 'error': str(e)}

    @staticmethod
    def get_balance(traveler_id: str) -> Dict[str, Any]:
        """
        Get TRIP token balance and stats for a traveler.

        Args:
            traveler_id: ID of the traveler

        Returns:
            dict: {
                'balance': int,
                'total_earned': int,
                'total_spent': int,
                'net_earnings': int
            }
        """
        try:
            traveler = Traveler.query.get(traveler_id)
            if not traveler:
                return {
                    'balance': 0,
                    'total_earned': 0,
                    'total_spent': 0,
                    'net_earnings': 0,
                    'error': 'Traveler not found'
                }

            return {
                'balance': traveler.trip_token_balance or 0,
                'total_earned': traveler.trip_earnings_total or 0,
                'total_spent': traveler.trip_spent_total or 0,
                'net_earnings': (traveler.trip_earnings_total or 0) - (traveler.trip_spent_total or 0)
            }

        except Exception as e:
            current_app.logger.error(f"Error getting TRIP balance: {str(e)}")
            return {
                'balance': 0,
                'total_earned': 0,
                'total_spent': 0,
                'net_earnings': 0,
                'error': str(e)
            }
