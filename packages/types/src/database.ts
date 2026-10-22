
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_invites": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"admin_role": Database["public"]['Enums']["admin_role"],"created_at": string,"expires_at": string,"id": string,"invited_by": string,"phone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"admin_role": Database["public"]['Enums']["admin_role"],"created_at"?: string,"expires_at"?: string,"id"?: string,"invited_by": string,"phone": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"admin_role"?: Database["public"]['Enums']["admin_role"],"created_at"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string,"phone"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_invites_accepted_by_fkey"
      columns: ["accepted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "admin_invites_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"alpha_invites": {
                  Row: {
                    "created_at": string,"id": string,"invited_by": string | null,"is_active": boolean,"phone": string,"role": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"invited_by"?: string | null,"is_active"?: boolean,"phone": string,"role": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"invited_by"?: string | null,"is_active"?: boolean,"phone"?: string,"role"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alpha_invites_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"app_config": {
                  Row: {
                    "description": string | null,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string | null,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_config_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"app_config_history": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"id": number,"key": string,"new_value": Json | null,"old_value": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: never,"key": string,"new_value"?: Json | null,"old_value"?: Json | null
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: never,"key"?: string,"new_value"?: Json | null,"old_value"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_config_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor": string | null,"after": Json | null,"at": string,"before": Json | null,"entity": string,"entity_id": string | null,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor"?: string | null,"after"?: Json | null,"at"?: string,"before"?: Json | null,"entity": string,"entity_id"?: string | null,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor"?: string | null,"after"?: Json | null,"at"?: string,"before"?: Json | null,"entity"?: string,"entity_id"?: string | null,"id"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_actor_fkey"
      columns: ["actor"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cancellation_claims": {
                  Row: {
                    "amount": number,"client_id": string,"collected_at": string | null,"created_at": string,"driver_id": string,"driver_share": number,"id": string,"ride_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"client_id": string,"collected_at"?: string | null,"created_at"?: string,"driver_id": string,"driver_share": number,"id"?: string,"ride_id": string,"status"?: string
                  }
                  Update: {
                    "amount"?: number,"client_id"?: string,"collected_at"?: string | null,"created_at"?: string,"driver_id"?: string,"driver_share"?: number,"id"?: string,"ride_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cancellation_claims_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cancellation_claims_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cancellation_claims_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: true
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"daily_statements": {
                  Row: {
                    "business_day": string,"closing": number,"created_at": string,"driver_id": string,"id": string,"opening": number,"payout_amount": number | null,"settled_amount": number | null,"status": Database["public"]['Enums']["statement_status"],"total_commission": number,"total_mobile_credit": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_day": string,"closing"?: number,"created_at"?: string,"driver_id": string,"id"?: string,"opening"?: number,"payout_amount"?: number | null,"settled_amount"?: number | null,"status"?: Database["public"]['Enums']["statement_status"],"total_commission"?: number,"total_mobile_credit"?: number,"updated_at"?: string
                  }
                  Update: {
                    "business_day"?: string,"closing"?: number,"created_at"?: string,"driver_id"?: string,"id"?: string,"opening"?: number,"payout_amount"?: number | null,"settled_amount"?: number | null,"status"?: Database["public"]['Enums']["statement_status"],"total_commission"?: number,"total_mobile_credit"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "daily_statements_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    }
                  ]
                },"data_usage": {
                  Row: {
                    "bytes_estimated": number,"day": string,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bytes_estimated"?: number,"day": string,"id"?: never,"user_id": string
                  }
                  Update: {
                    "bytes_estimated"?: number,"day"?: string,"id"?: never,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "data_usage_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"devices": {
                  Row: {
                    "created_at": string,"id": string,"last_seen": string,"platform": string,"push_token": string,"session_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"last_seen"?: string,"platform": string,"push_token": string,"session_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"last_seen"?: string,"platform"?: string,"push_token"?: string,"session_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "devices_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"driver_documents": {
                  Row: {
                    "created_at": string,"driver_id": string,"id": string,"note": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["kyc_status"],"storage_path": string,"type": Database["public"]['Enums']["document_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"driver_id": string,"id"?: string,"note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["kyc_status"],"storage_path": string,"type": Database["public"]['Enums']["document_type"]
                  }
                  Update: {
                    "created_at"?: string,"driver_id"?: string,"id"?: string,"note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["kyc_status"],"storage_path"?: string,"type"?: Database["public"]['Enums']["document_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "driver_documents_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "driver_documents_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"driver_presence": {
                  Row: {
                    "driver_id": string,"geom": unknown,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "driver_id": string,"geom": unknown,"updated_at"?: string
                  }
                  Update: {
                    "driver_id"?: string,"geom"?: unknown,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "driver_presence_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: true
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    }
                  ]
                },"drivers": {
                  Row: {
                    "categories": (Database["public"]['Enums']["vehicle_category"])[],"created_at": string,"current_balance_cache": number,"deactivated_reason": string | null,"gps_consent": boolean,"id": string,"is_active": boolean,"kyc_status": Database["public"]['Enums']["kyc_status"],"payout_msisdn": string | null,"physical_verified_at": string | null,"physical_verified_by": string | null,"rating_avg": number,"updated_at": string,"vehicle_locked_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "categories"?: (Database["public"]['Enums']["vehicle_category"])[],"created_at"?: string,"current_balance_cache"?: number,"deactivated_reason"?: string | null,"gps_consent"?: boolean,"id": string,"is_active"?: boolean,"kyc_status"?: Database["public"]['Enums']["kyc_status"],"payout_msisdn"?: string | null,"physical_verified_at"?: string | null,"physical_verified_by"?: string | null,"rating_avg"?: number,"updated_at"?: string,"vehicle_locked_at"?: string | null
                  }
                  Update: {
                    "categories"?: (Database["public"]['Enums']["vehicle_category"])[],"created_at"?: string,"current_balance_cache"?: number,"deactivated_reason"?: string | null,"gps_consent"?: boolean,"id"?: string,"is_active"?: boolean,"kyc_status"?: Database["public"]['Enums']["kyc_status"],"payout_msisdn"?: string | null,"physical_verified_at"?: string | null,"physical_verified_by"?: string | null,"rating_avg"?: number,"updated_at"?: string,"vehicle_locked_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "drivers_id_fkey"
      columns: ["id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "drivers_physical_verified_by_fkey"
      columns: ["physical_verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gps_traces": {
                  Row: {
                    "consented": boolean,"created_at": string,"driver_id": string,"id": string,"points": unknown,"ride_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "consented"?: boolean,"created_at"?: string,"driver_id": string,"id"?: string,"points": unknown,"ride_id"?: string | null
                  }
                  Update: {
                    "consented"?: boolean,"created_at"?: string,"driver_id"?: string,"id"?: string,"points"?: unknown,"ride_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gps_traces_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gps_traces_ride_fk"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"incidents": {
                  Row: {
                    "assigned_to": string | null,"created_at": string,"id": string,"kind": Database["public"]['Enums']["incident_kind"],"message": string | null,"reporter": string,"resolution_note": string | null,"resolved_at": string | null,"ride_id": string | null,"status": Database["public"]['Enums']["incident_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["incident_kind"],"message"?: string | null,"reporter": string,"resolution_note"?: string | null,"resolved_at"?: string | null,"ride_id"?: string | null,"status"?: Database["public"]['Enums']["incident_status"]
                  }
                  Update: {
                    "assigned_to"?: string | null,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["incident_kind"],"message"?: string | null,"reporter"?: string,"resolution_note"?: string | null,"resolved_at"?: string | null,"ride_id"?: string | null,"status"?: Database["public"]['Enums']["incident_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "incidents_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_reporter_fkey"
      columns: ["reporter"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"landmark_proposals": {
                  Row: {
                    "aliases": (string)[],"category": Database["public"]['Enums']["landmark_category"],"created_at": string,"geom": unknown,"id": string,"landmark_id": string | null,"name": string,"photo_url": string | null,"proposed_by": string | null,"reviewed_by": string | null,"role": Database["public"]['Enums']["user_role"] | null,"status": Database["public"]['Enums']["geo_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "aliases"?: (string)[],"category"?: Database["public"]['Enums']["landmark_category"],"created_at"?: string,"geom": unknown,"id"?: string,"landmark_id"?: string | null,"name": string,"photo_url"?: string | null,"proposed_by"?: string | null,"reviewed_by"?: string | null,"role"?: Database["public"]['Enums']["user_role"] | null,"status"?: Database["public"]['Enums']["geo_status"]
                  }
                  Update: {
                    "aliases"?: (string)[],"category"?: Database["public"]['Enums']["landmark_category"],"created_at"?: string,"geom"?: unknown,"id"?: string,"landmark_id"?: string | null,"name"?: string,"photo_url"?: string | null,"proposed_by"?: string | null,"reviewed_by"?: string | null,"role"?: Database["public"]['Enums']["user_role"] | null,"status"?: Database["public"]['Enums']["geo_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "landmark_proposals_landmark_id_fkey"
      columns: ["landmark_id"]
isOneToOne: false
      referencedRelation: "landmarks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "landmark_proposals_proposed_by_fkey"
      columns: ["proposed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "landmark_proposals_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"landmarks": {
                  Row: {
                    "aliases": (string)[],"category": Database["public"]['Enums']["landmark_category"],"created_at": string,"created_by": string | null,"geom": unknown,"id": string,"name": string,"photo_url": string | null,"provenance": Database["public"]['Enums']["geo_provenance"],"salience": number,"source": Database["public"]['Enums']["geo_source"],"status": Database["public"]['Enums']["geo_status"],"updated_at": string,"usage_count": number,"validated_by": string | null,"zone_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aliases"?: (string)[],"category"?: Database["public"]['Enums']["landmark_category"],"created_at"?: string,"created_by"?: string | null,"geom": unknown,"id"?: string,"name": string,"photo_url"?: string | null,"provenance"?: Database["public"]['Enums']["geo_provenance"],"salience"?: number,"source"?: Database["public"]['Enums']["geo_source"],"status"?: Database["public"]['Enums']["geo_status"],"updated_at"?: string,"usage_count"?: number,"validated_by"?: string | null,"zone_id"?: string | null
                  }
                  Update: {
                    "aliases"?: (string)[],"category"?: Database["public"]['Enums']["landmark_category"],"created_at"?: string,"created_by"?: string | null,"geom"?: unknown,"id"?: string,"name"?: string,"photo_url"?: string | null,"provenance"?: Database["public"]['Enums']["geo_provenance"],"salience"?: number,"source"?: Database["public"]['Enums']["geo_source"],"status"?: Database["public"]['Enums']["geo_status"],"updated_at"?: string,"usage_count"?: number,"validated_by"?: string | null,"zone_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "landmarks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "landmarks_validated_by_fkey"
      columns: ["validated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "landmarks_zone_id_fkey"
      columns: ["zone_id"]
isOneToOne: false
      referencedRelation: "zones"
      referencedColumns: ["id"]
    }
                  ]
                },"ledger": {
                  Row: {
                    "amount_signed": number,"balance_after": number,"business_day": string,"created_at": string,"driver_id": string,"id": number,"kind": Database["public"]['Enums']["ledger_kind"],"payment_id": string | null,"ride_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_signed": number,"balance_after": number,"business_day": string,"created_at"?: string,"driver_id": string,"id"?: never,"kind": Database["public"]['Enums']["ledger_kind"],"payment_id"?: string | null,"ride_id"?: string | null
                  }
                  Update: {
                    "amount_signed"?: number,"balance_after"?: number,"business_day"?: string,"created_at"?: string,"driver_id"?: string,"id"?: never,"kind"?: Database["public"]['Enums']["ledger_kind"],"payment_id"?: string | null,"ride_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ledger_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"manual_receipts": {
                  Row: {
                    "amount": number,"approved_at": string | null,"approved_by": string | null,"claim_id": string | null,"created_at": string,"created_by": string,"driver_id": string,"id": string,"kind": string,"method": string,"payment_id": string | null,"previous_receipt_id": string | null,"proof_path": string,"reference": string,"rejected_at": string | null,"rejected_by": string | null,"rejection_reason": string | null,"status": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"approved_at"?: string | null,"approved_by"?: string | null,"claim_id"?: string | null,"created_at"?: string,"created_by": string,"driver_id": string,"id"?: string,"kind": string,"method": string,"payment_id"?: string | null,"previous_receipt_id"?: string | null,"proof_path": string,"reference": string,"rejected_at"?: string | null,"rejected_by"?: string | null,"rejection_reason"?: string | null,"status"?: string,"version"?: number
                  }
                  Update: {
                    "amount"?: number,"approved_at"?: string | null,"approved_by"?: string | null,"claim_id"?: string | null,"created_at"?: string,"created_by"?: string,"driver_id"?: string,"id"?: string,"kind"?: string,"method"?: string,"payment_id"?: string | null,"previous_receipt_id"?: string | null,"proof_path"?: string,"reference"?: string,"rejected_at"?: string | null,"rejected_by"?: string | null,"rejection_reason"?: string | null,"status"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "manual_receipts_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "manual_receipts_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "cancellation_claims"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "manual_receipts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "manual_receipts_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "manual_receipts_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: true
      referencedRelation: "payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "manual_receipts_previous_receipt_id_fkey"
      columns: ["previous_receipt_id"]
isOneToOne: true
      referencedRelation: "manual_receipts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "manual_receipts_rejected_by_fkey"
      columns: ["rejected_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": string,"payload": NonNullable<Json>,"read_at": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_at": string,"currency": string,"direction": Database["public"]['Enums']["payment_direction"],"driver_id": string | null,"id": string,"kind": Database["public"]['Enums']["payment_kind"],"partner_txn_id": string,"provider": string,"provider_txn_id": string | null,"raw": NonNullable<Json>,"ride_id": string | null,"status": Database["public"]['Enums']["payment_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"currency"?: string,"direction": Database["public"]['Enums']["payment_direction"],"driver_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["payment_kind"],"partner_txn_id": string,"provider"?: string,"provider_txn_id"?: string | null,"raw"?: NonNullable<Json>,"ride_id"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"currency"?: string,"direction"?: Database["public"]['Enums']["payment_direction"],"driver_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["payment_kind"],"partner_txn_id"?: string,"provider"?: string,"provider_txn_id"?: string | null,"raw"?: NonNullable<Json>,"ride_id"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"payout_requests": {
                  Row: {
                    "amount": number,"business_day": string,"created_at": string,"driver_id": string,"id": string,"paid_at": string | null,"receipt_id": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"business_day": string,"created_at"?: string,"driver_id": string,"id"?: string,"paid_at"?: string | null,"receipt_id"?: string | null,"status"?: string
                  }
                  Update: {
                    "amount"?: number,"business_day"?: string,"created_at"?: string,"driver_id"?: string,"id"?: string,"paid_at"?: string | null,"receipt_id"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payout_requests_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payout_requests_receipt_id_fkey"
      columns: ["receipt_id"]
isOneToOne: true
      referencedRelation: "manual_receipts"
      referencedColumns: ["id"]
    }
                  ]
                },"pricing_rules": {
                  Row: {
                    "base_fare": number,"category": Database["public"]['Enums']["vehicle_category"],"created_at": string,"created_by": string | null,"id": string,"min_fare": number,"multipliers": NonNullable<Json>,"per_km": number,"per_min": number,"valid_from": string,"zone_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "base_fare"?: number,"category": Database["public"]['Enums']["vehicle_category"],"created_at"?: string,"created_by"?: string | null,"id"?: string,"min_fare"?: number,"multipliers"?: NonNullable<Json>,"per_km"?: number,"per_min"?: number,"valid_from"?: string,"zone_id"?: string | null
                  }
                  Update: {
                    "base_fare"?: number,"category"?: Database["public"]['Enums']["vehicle_category"],"created_at"?: string,"created_by"?: string | null,"id"?: string,"min_fare"?: number,"multipliers"?: NonNullable<Json>,"per_km"?: number,"per_min"?: number,"valid_from"?: string,"zone_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pricing_rules_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pricing_rules_zone_id_fkey"
      columns: ["zone_id"]
isOneToOne: false
      referencedRelation: "zones"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "admin_role": Database["public"]['Enums']["admin_role"] | null,"created_at": string,"deleted_at": string | null,"deletion_requested_at": string | null,"email": string | null,"full_name": string | null,"id": string,"last_seen_at": string,"locale": string,"phone": string | null,"photo_url": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_role"?: Database["public"]['Enums']["admin_role"] | null,"created_at"?: string,"deleted_at"?: string | null,"deletion_requested_at"?: string | null,"email"?: string | null,"full_name"?: string | null,"id": string,"last_seen_at"?: string,"locale"?: string,"phone"?: string | null,"photo_url"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "admin_role"?: Database["public"]['Enums']["admin_role"] | null,"created_at"?: string,"deleted_at"?: string | null,"deletion_requested_at"?: string | null,"email"?: string | null,"full_name"?: string | null,"id"?: string,"last_seen_at"?: string,"locale"?: string,"phone"?: string | null,"photo_url"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"push_deliveries": {
                  Row: {
                    "attempts": number,"created_at": string,"detail": string | null,"device_id": string,"expires_at": string,"id": string,"next_attempt_at": string,"notification_id": string,"status": string,"ticket_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"detail"?: string | null,"device_id": string,"expires_at": string,"id"?: string,"next_attempt_at"?: string,"notification_id": string,"status"?: string,"ticket_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"detail"?: string | null,"device_id"?: string,"expires_at"?: string,"id"?: string,"next_attempt_at"?: string,"notification_id"?: string,"status"?: string,"ticket_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_deliveries_device_id_fkey"
      columns: ["device_id"]
isOneToOne: false
      referencedRelation: "devices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "push_deliveries_notification_id_fkey"
      columns: ["notification_id"]
isOneToOne: false
      referencedRelation: "notifications"
      referencedColumns: ["id"]
    }
                  ]
                },"ratings": {
                  Row: {
                    "comment": string | null,"created_at": string,"from_user": string,"id": string,"ride_id": string,"stars": number,"to_user": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"from_user": string,"id"?: string,"ride_id": string,"stars": number,"to_user": string
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"from_user"?: string,"id"?: string,"ride_id"?: string,"stars"?: number,"to_user"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ratings_from_user_fkey"
      columns: ["from_user"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_to_user_fkey"
      columns: ["to_user"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ride_events": {
                  Row: {
                    "actor": string | null,"at": string,"id": number,"meta": NonNullable<Json>,"ride_id": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor"?: string | null,"at"?: string,"id"?: never,"meta"?: NonNullable<Json>,"ride_id": string,"type": string
                  }
                  Update: {
                    "actor"?: string | null,"at"?: string,"id"?: never,"meta"?: NonNullable<Json>,"ride_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ride_events_actor_fkey"
      columns: ["actor"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ride_events_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"ride_locations": {
                  Row: {
                    "driver_id": string | null,"geom": unknown,"id": number,"recorded_at": string,"ride_id": string,"sample_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "driver_id"?: string | null,"geom": unknown,"id"?: never,"recorded_at"?: string,"ride_id": string,"sample_id"?: string | null
                  }
                  Update: {
                    "driver_id"?: string | null,"geom"?: unknown,"id"?: never,"recorded_at"?: string,"ride_id"?: string,"sample_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ride_locations_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ride_locations_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"ride_offers": {
                  Row: {
                    "driver_id": string,"expires_at": string,"id": string,"offered_at": string,"rank": number,"responded_at": string | null,"ride_id": string,"status": Database["public"]['Enums']["offer_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "driver_id": string,"expires_at": string,"id"?: string,"offered_at"?: string,"rank": number,"responded_at"?: string | null,"ride_id": string,"status"?: Database["public"]['Enums']["offer_status"]
                  }
                  Update: {
                    "driver_id"?: string,"expires_at"?: string,"id"?: string,"offered_at"?: string,"rank"?: number,"responded_at"?: string | null,"ride_id"?: string,"status"?: Database["public"]['Enums']["offer_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "ride_offers_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ride_offers_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"ride_quotes": {
                  Row: {
                    "category": Database["public"]['Enums']["vehicle_category"],"client_id": string,"created_at": string,"dest_geom": unknown,"distance_m": number,"duration_s": number,"expires_at": string,"id": string,"origin_geom": unknown,"price": number,"ride_id": string | null,"route_shape": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["vehicle_category"],"client_id": string,"created_at"?: string,"dest_geom": unknown,"distance_m": number,"duration_s": number,"expires_at": string,"id"?: string,"origin_geom": unknown,"price": number,"ride_id"?: string | null,"route_shape": string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["vehicle_category"],"client_id"?: string,"created_at"?: string,"dest_geom"?: unknown,"distance_m"?: number,"duration_s"?: number,"expires_at"?: string,"id"?: string,"origin_geom"?: unknown,"price"?: number,"ride_id"?: string | null,"route_shape"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ride_quotes_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ride_quotes_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: true
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"rides": {
                  Row: {
                    "accepted_at": string | null,"arrived_at": string | null,"cancel_reason": string | null,"category": Database["public"]['Enums']["vehicle_category"],"client_id": string,"completed_at": string | null,"created_at": string,"dest_geom": unknown,"dest_hint": string | null,"dest_landmark_id": string | null,"distance_est_m": number | null,"driver_id": string | null,"duration_est_s": number | null,"id": string,"meeting_landmark_id": string | null,"origin_geom": unknown,"origin_hint": string | null,"origin_landmark_id": string | null,"payment_method": Database["public"]['Enums']["payment_method"] | null,"pin_code": string | null,"price_est": number | null,"price_final": number | null,"scheduled_at": string | null,"started_at": string | null,"status": Database["public"]['Enums']["ride_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"arrived_at"?: string | null,"cancel_reason"?: string | null,"category": Database["public"]['Enums']["vehicle_category"],"client_id": string,"completed_at"?: string | null,"created_at"?: string,"dest_geom": unknown,"dest_hint"?: string | null,"dest_landmark_id"?: string | null,"distance_est_m"?: number | null,"driver_id"?: string | null,"duration_est_s"?: number | null,"id"?: string,"meeting_landmark_id"?: string | null,"origin_geom": unknown,"origin_hint"?: string | null,"origin_landmark_id"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"pin_code"?: string | null,"price_est"?: number | null,"price_final"?: number | null,"scheduled_at"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["ride_status"],"updated_at"?: string
                  }
                  Update: {
                    "accepted_at"?: string | null,"arrived_at"?: string | null,"cancel_reason"?: string | null,"category"?: Database["public"]['Enums']["vehicle_category"],"client_id"?: string,"completed_at"?: string | null,"created_at"?: string,"dest_geom"?: unknown,"dest_hint"?: string | null,"dest_landmark_id"?: string | null,"distance_est_m"?: number | null,"driver_id"?: string | null,"duration_est_s"?: number | null,"id"?: string,"meeting_landmark_id"?: string | null,"origin_geom"?: unknown,"origin_hint"?: string | null,"origin_landmark_id"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"pin_code"?: string | null,"price_est"?: number | null,"price_final"?: number | null,"scheduled_at"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["ride_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rides_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rides_dest_landmark_id_fkey"
      columns: ["dest_landmark_id"]
isOneToOne: false
      referencedRelation: "landmarks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rides_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rides_meeting_landmark_id_fkey"
      columns: ["meeting_landmark_id"]
isOneToOne: false
      referencedRelation: "landmarks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rides_origin_landmark_id_fkey"
      columns: ["origin_landmark_id"]
isOneToOne: false
      referencedRelation: "landmarks"
      referencedColumns: ["id"]
    }
                  ]
                },"road_proposals": {
                  Row: {
                    "created_at": string,"derived_from": NonNullable<Json>,"distinct_drivers": number,"geom": unknown,"id": string,"reviewed_by": string | null,"status": Database["public"]['Enums']["geo_status"],"support_count": number,"window_end": string | null,"window_start": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"derived_from"?: NonNullable<Json>,"distinct_drivers"?: number,"geom": unknown,"id"?: string,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["geo_status"],"support_count"?: number,"window_end"?: string | null,"window_start"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"derived_from"?: NonNullable<Json>,"distinct_drivers"?: number,"geom"?: unknown,"id"?: string,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["geo_status"],"support_count"?: number,"window_end"?: string | null,"window_start"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "road_proposals_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"road_segments": {
                  Row: {
                    "attributes": NonNullable<Json>,"created_at": string,"created_by": string | null,"geom": unknown,"id": string,"provenance": Database["public"]['Enums']["geo_provenance"],"source": Database["public"]['Enums']["geo_source"],"status": Database["public"]['Enums']["geo_status"],"updated_at": string,"validated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attributes"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"geom": unknown,"id"?: string,"provenance"?: Database["public"]['Enums']["geo_provenance"],"source"?: Database["public"]['Enums']["geo_source"],"status"?: Database["public"]['Enums']["geo_status"],"updated_at"?: string,"validated_by"?: string | null
                  }
                  Update: {
                    "attributes"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"geom"?: unknown,"id"?: string,"provenance"?: Database["public"]['Enums']["geo_provenance"],"source"?: Database["public"]['Enums']["geo_source"],"status"?: Database["public"]['Enums']["geo_status"],"updated_at"?: string,"validated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "road_segments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "road_segments_validated_by_fkey"
      columns: ["validated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_places": {
                  Row: {
                    "created_at": string,"geom": unknown,"hint": string | null,"id": string,"kind": Database["public"]['Enums']["saved_place_kind"],"label": string,"landmark_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"geom": unknown,"hint"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["saved_place_kind"],"label": string,"landmark_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"geom"?: unknown,"hint"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["saved_place_kind"],"label"?: string,"landmark_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_places_landmark_id_fkey"
      columns: ["landmark_id"]
isOneToOne: false
      referencedRelation: "landmarks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_places_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"trip_shares": {
                  Row: {
                    "created_at": string,"created_by": string,"expires_at": string,"id": string,"revoked_at": string | null,"ride_id": string,"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"expires_at": string,"id"?: string,"revoked_at"?: string | null,"ride_id": string,"token"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"expires_at"?: string,"id"?: string,"revoked_at"?: string | null,"ride_id"?: string,"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trip_shares_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trip_shares_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicles": {
                  Row: {
                    "category": Database["public"]['Enums']["vehicle_category"],"created_at": string,"driver_id": string,"id": string,"photo_url": string | null,"plate": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["vehicle_category"],"created_at"?: string,"driver_id": string,"id"?: string,"photo_url"?: string | null,"plate"?: string | null
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["vehicle_category"],"created_at"?: string,"driver_id"?: string,"id"?: string,"photo_url"?: string | null,"plate"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicles_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    }
                  ]
                },"zones": {
                  Row: {
                    "coverage_status": Database["public"]['Enums']["coverage_status"],"created_at": string,"geom": unknown,"id": string,"is_active": boolean,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "coverage_status"?: Database["public"]['Enums']["coverage_status"],"created_at"?: string,"geom": unknown,"id"?: string,"is_active"?: boolean,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "coverage_status"?: Database["public"]['Enums']["coverage_status"],"created_at"?: string,"geom"?: unknown,"id"?: string,"is_active"?: boolean,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_approve_manual_receipt_v1":
{ Args: { "p_receipt": string }; Returns: {
              "amount": number,
"approved_at": string | null,
"approved_by": string | null,
"claim_id": string | null,
"created_at": string,
"created_by": string,
"driver_id": string,
"id": string,
"kind": string,
"method": string,
"payment_id": string | null,
"previous_receipt_id": string | null,
"proof_path": string,
"reference": string,
"rejected_at": string | null,
"rejected_by": string | null,
"rejection_reason": string | null,
"status": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "manual_receipts"
        isOneToOne: true
        isSetofReturn: false
      } },
"_complete_ride":
{ Args: { "p_price_final"?: number,"p_ride": string }; Returns: {
              "accepted_at": string | null,
"arrived_at": string | null,
"cancel_reason": string | null,
"category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"completed_at": string | null,
"created_at": string,
"dest_geom": unknown,
"dest_hint": string | null,
"dest_landmark_id": string | null,
"distance_est_m": number | null,
"driver_id": string | null,
"duration_est_s": number | null,
"id": string,
"meeting_landmark_id": string | null,
"origin_geom": unknown,
"origin_hint": string | null,
"origin_landmark_id": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"pin_code": string | null,
"price_est": number | null,
"price_final": number | null,
"scheduled_at": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["ride_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rides"
        isOneToOne: true
        isSetofReturn: false
      } },
"_confirm_payment":
{ Args: { "p_payment": string }; Returns: undefined
                           },
"_create_ride_quote":
{ Args: { "p_category": Database["public"]['Enums']["vehicle_category"],"p_client": string,"p_dest": unknown,"p_distance_m": number,"p_duration_s": number,"p_origin": unknown,"p_shape": string }; Returns: {
              "category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"created_at": string,
"dest_geom": unknown,
"distance_m": number,
"duration_s": number,
"expires_at": string,
"id": string,
"origin_geom": unknown,
"price": number,
"ride_id": string | null,
"route_shape": string
            }
                          SetofOptions: {
        from: "*"
        to: "ride_quotes"
        isOneToOne: true
        isSetofReturn: false
      } },
"_daily_close_unguarded":
{ Args: { "p_day"?: string }; Returns: number
                           },
"_driver_balance":
{ Args: { "p_driver": string }; Returns: number
                           },
"_driver_heartbeat":
{ Args: { "p_point": unknown }; Returns: undefined
                           },
"_driver_transition":
{ Args: { "p_event": string,"p_from": (Database["public"]['Enums']["ride_status"])[],"p_ride": string,"p_to": Database["public"]['Enums']["ride_status"] }; Returns: {
              "accepted_at": string | null,
"arrived_at": string | null,
"cancel_reason": string | null,
"category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"completed_at": string | null,
"created_at": string,
"dest_geom": unknown,
"dest_hint": string | null,
"dest_landmark_id": string | null,
"distance_est_m": number | null,
"driver_id": string | null,
"duration_est_s": number | null,
"id": string,
"meeting_landmark_id": string | null,
"origin_geom": unknown,
"origin_hint": string | null,
"origin_landmark_id": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"pin_code": string | null,
"price_est": number | null,
"price_final": number | null,
"scheduled_at": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["ride_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rides"
        isOneToOne: true
        isSetofReturn: false
      } },
"_respond_offer":
{ Args: { "p_accept": boolean,"p_offer": string }; Returns: {
              "accepted_at": string | null,
"arrived_at": string | null,
"cancel_reason": string | null,
"category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"completed_at": string | null,
"created_at": string,
"dest_geom": unknown,
"dest_hint": string | null,
"dest_landmark_id": string | null,
"distance_est_m": number | null,
"driver_id": string | null,
"duration_est_s": number | null,
"id": string,
"meeting_landmark_id": string | null,
"origin_geom": unknown,
"origin_hint": string | null,
"origin_landmark_id": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"pin_code": string | null,
"price_est": number | null,
"price_final": number | null,
"scheduled_at": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["ride_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rides"
        isOneToOne: true
        isSetofReturn: false
      } },
"_validate_kyc":
{ Args: { "p_accept": boolean,"p_driver": string,"p_note"?: string }; Returns: undefined
                           },
"accept_ride":
{ Args: { "p_ride": string }; Returns: {
              "accepted_at": string | null,
"arrived_at": string | null,
"cancel_reason": string | null,
"category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"completed_at": string | null,
"created_at": string,
"dest_geom": unknown,
"dest_hint": string | null,
"dest_landmark_id": string | null,
"distance_est_m": number | null,
"driver_id": string | null,
"duration_est_s": number | null,
"id": string,
"meeting_landmark_id": string | null,
"origin_geom": unknown,
"origin_hint": string | null,
"origin_landmark_id": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"pin_code": string | null,
"price_est": number | null,
"price_final": number | null,
"scheduled_at": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["ride_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rides"
        isOneToOne: true
        isSetofReturn: false
      } },
"activate_scheduled_rides":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"approve_manual_receipt":
{ Args: { "p_receipt": string }; Returns: {
              "amount": number,
"approved_at": string | null,
"approved_by": string | null,
"claim_id": string | null,
"created_at": string,
"created_by": string,
"driver_id": string,
"id": string,
"kind": string,
"method": string,
"payment_id": string | null,
"previous_receipt_id": string | null,
"proof_path": string,
"reference": string,
"rejected_at": string | null,
"rejected_by": string | null,
"rejection_reason": string | null,
"status": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "manual_receipts"
        isOneToOne: true
        isSetofReturn: false
      } },
"assert_admin_or_service":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"bump_landmark_usage":
{ Args: { "p_landmark": string }; Returns: undefined
                           },
"business_day":
{ Args: { "ts"?: string }; Returns: string
                           },
"cancel_account_deletion":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"cancel_ride":
{ Args: { "p_reason"?: string,"p_ride": string,"p_status"?: Database["public"]['Enums']["ride_status"] }; Returns: {
              "accepted_at": string | null,
"arrived_at": string | null,
"cancel_reason": string | null,
"category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"completed_at": string | null,
"created_at": string,
"dest_geom": unknown,
"dest_hint": string | null,
"dest_landmark_id": string | null,
"distance_est_m": number | null,
"driver_id": string | null,
"duration_est_s": number | null,
"id": string,
"meeting_landmark_id": string | null,
"origin_geom": unknown,
"origin_hint": string | null,
"origin_landmark_id": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"pin_code": string | null,
"price_est": number | null,
"price_final": number | null,
"scheduled_at": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["ride_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rides"
        isOneToOne: true
        isSetofReturn: false
      } },
"cancellation_driver_share":
{ Args: { "p_cfg": Json,"p_fee": number }; Returns: number
                           },
"claim_push_deliveries":
{ Args: { "p_notification"?: string }; Returns: {
              "device_id": string,"expires_at": string,"id": string,"notification_id": string,"payload": Json,"push_token": string,"type": string
            }[]
                           },
"commission_amount":
{ Args: { "p_price": number }; Returns: number
                           },
"complete_ride":
{ Args: { "p_price_final"?: number,"p_ride": string }; Returns: {
              "accepted_at": string | null,
"arrived_at": string | null,
"cancel_reason": string | null,
"category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"completed_at": string | null,
"created_at": string,
"dest_geom": unknown,
"dest_hint": string | null,
"dest_landmark_id": string | null,
"distance_est_m": number | null,
"driver_id": string | null,
"duration_est_s": number | null,
"id": string,
"meeting_landmark_id": string | null,
"origin_geom": unknown,
"origin_hint": string | null,
"origin_landmark_id": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"pin_code": string | null,
"price_est": number | null,
"price_final": number | null,
"scheduled_at": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["ride_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rides"
        isOneToOne: true
        isSetofReturn: false
      } },
"confirm_payment":
{ Args: { "p_payment": string }; Returns: undefined
                           },
"create_ride_quote":
{ Args: { "p_category": Database["public"]['Enums']["vehicle_category"],"p_client": string,"p_dest": unknown,"p_distance_m": number,"p_duration_s": number,"p_origin": unknown,"p_shape": string }; Returns: {
              "category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"created_at": string,
"dest_geom": unknown,
"distance_m": number,
"duration_s": number,
"expires_at": string,
"id": string,
"origin_geom": unknown,
"price": number,
"ride_id": string | null,
"route_shape": string
            }
                          SetofOptions: {
        from: "*"
        to: "ride_quotes"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_settlement_payment":
{ Args: { "p_amount": number }; Returns: {
              "amount": number,
"created_at": string,
"currency": string,
"direction": Database["public"]['Enums']["payment_direction"],
"driver_id": string | null,
"id": string,
"kind": Database["public"]['Enums']["payment_kind"],
"partner_txn_id": string,
"provider": string,
"provider_txn_id": string | null,
"raw": NonNullable<Json>,
"ride_id": string | null,
"status": Database["public"]['Enums']["payment_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_trip_share":
{ Args: { "p_ride": string }; Returns: {
              "created_at": string,
"created_by": string,
"expires_at": string,
"id": string,
"revoked_at": string | null,
"ride_id": string,
"token": string
            }
                          SetofOptions: {
        from: "*"
        to: "trip_shares"
        isOneToOne: true
        isSetofReturn: false
      } },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"daily_close":
{ Args: { "p_day"?: string }; Returns: number
                           },
"driver_balance":
{ Args: { "p_driver": string }; Returns: number
                           },
"driver_heartbeat":
{ Args: { "p_point": unknown }; Returns: undefined
                           },
"driver_offline":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"enqueue_notification":
{ Args: { "p_payload"?: Json,"p_type": string,"p_user": string }; Returns: {
              "created_at": string,
"id": string,
"payload": NonNullable<Json>,
"read_at": string | null,
"type": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "notifications"
        isOneToOne: true
        isSetofReturn: false
      } },
"estimate_cancellation_fee":
{ Args: { "p_ride": string }; Returns: number
                           },
"estimate_price":
{ Args: { "p_category": Database["public"]['Enums']["vehicle_category"],"p_distance_m": number,"p_duration_s": number,"p_zone"?: string }; Returns: number
                           },
"expire_stale_offers":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"fail_payment":
{ Args: { "p_payment": string,"p_reason"?: string }; Returns: undefined
                           },
"get_commission":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_shared_trip":
{ Args: { "p_token": string }; Returns: Json
                           },
"has_admin_role":
{ Args: { "req": Database["public"]['Enums']["admin_role"] }; Returns: boolean
                           },
"invite_admin":
{ Args: { "p_phone": string,"p_role": Database["public"]['Enums']["admin_role"] }; Returns: {
              "accepted_at": string | null,
"accepted_by": string | null,
"admin_role": Database["public"]['Enums']["admin_role"],
"created_at": string,
"expires_at": string,
"id": string,
"invited_by": string,
"phone": string
            }
                          SetofOptions: {
        from: "*"
        to: "admin_invites"
        isOneToOne: true
        isSetofReturn: false
      } },
"invite_alpha":
{ Args: { "p_active"?: boolean,"p_phone": string,"p_role": string }; Returns: {
              "created_at": string,
"id": string,
"invited_by": string | null,
"is_active": boolean,
"phone": string,
"role": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "alpha_invites"
        isOneToOne: true
        isSetofReturn: false
      } },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_alpha_invited":
{ Args: { "p_role": string }; Returns: boolean
                           },
"is_driver":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_ride_participant":
{ Args: { "p_ride": string }; Returns: boolean
                           },
"is_superadmin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"mark_arrived":
{ Args: { "p_ride": string }; Returns: {
              "accepted_at": string | null,
"arrived_at": string | null,
"cancel_reason": string | null,
"category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"completed_at": string | null,
"created_at": string,
"dest_geom": unknown,
"dest_hint": string | null,
"dest_landmark_id": string | null,
"distance_est_m": number | null,
"driver_id": string | null,
"duration_est_s": number | null,
"id": string,
"meeting_landmark_id": string | null,
"origin_geom": unknown,
"origin_hint": string | null,
"origin_landmark_id": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"pin_code": string | null,
"price_est": number | null,
"price_final": number | null,
"scheduled_at": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["ride_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rides"
        isOneToOne: true
        isSetofReturn: false
      } },
"mark_notification_read":
{ Args: { "p_id": string }; Returns: undefined
                           },
"maybe_reactivate_driver":
{ Args: { "p_driver": string }; Returns: undefined
                           },
"nearest_landmarks":
{ Args: { "p_limit"?: number,"p_max_m"?: number,"p_point": unknown }; Returns: {
              "aliases": (string)[],
"category": Database["public"]['Enums']["landmark_category"],
"created_at": string,
"created_by": string | null,
"geom": unknown,
"id": string,
"name": string,
"photo_url": string | null,
"provenance": Database["public"]['Enums']["geo_provenance"],
"salience": number,
"source": Database["public"]['Enums']["geo_source"],
"status": Database["public"]['Enums']["geo_status"],
"updated_at": string,
"usage_count": number,
"validated_by": string | null,
"zone_id": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "landmarks"
        isOneToOne: false
        isSetofReturn: true
      } },
"needs_reverification":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"notify_purge_webhook":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"offer_details":
{ Args: { "p_offer": string }; Returns: Json
                           },
"offer_next_driver":
{ Args: { "p_ride": string }; Returns: {
              "driver_id": string,
"expires_at": string,
"id": string,
"offered_at": string,
"rank": number,
"responded_at": string | null,
"ride_id": string,
"status": Database["public"]['Enums']["offer_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "ride_offers"
        isOneToOne: true
        isSetofReturn: false
      } },
"pending_auth_purges":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"post_ledger":
{ Args: { "p_amount": number,"p_driver": string,"p_kind": Database["public"]['Enums']["ledger_kind"],"p_payment"?: string,"p_ride"?: string,"p_ts"?: string }; Returns: {
              "amount_signed": number,
"balance_after": number,
"business_day": string,
"created_at": string,
"driver_id": string,
"id": number,
"kind": Database["public"]['Enums']["ledger_kind"],
"payment_id": string | null,
"ride_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "ledger"
        isOneToOne: true
        isSetofReturn: false
      } },
"prepare_manual_receipt":
{ Args: { "p_amount": number,"p_claim"?: string,"p_driver": string,"p_kind": string,"p_method": string,"p_proof_path": string,"p_reference": string }; Returns: {
              "amount": number,
"approved_at": string | null,
"approved_by": string | null,
"claim_id": string | null,
"created_at": string,
"created_by": string,
"driver_id": string,
"id": string,
"kind": string,
"method": string,
"payment_id": string | null,
"previous_receipt_id": string | null,
"proof_path": string,
"reference": string,
"rejected_at": string | null,
"rejected_by": string | null,
"rejection_reason": string | null,
"status": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "manual_receipts"
        isOneToOne: true
        isSetofReturn: false
      } },
"prepare_payout_receipt":
{ Args: { "p_method": string,"p_proof_path": string,"p_reference": string,"p_request": string }; Returns: {
              "amount": number,
"approved_at": string | null,
"approved_by": string | null,
"claim_id": string | null,
"created_at": string,
"created_by": string,
"driver_id": string,
"id": string,
"kind": string,
"method": string,
"payment_id": string | null,
"previous_receipt_id": string | null,
"proof_path": string,
"reference": string,
"rejected_at": string | null,
"rejected_by": string | null,
"rejection_reason": string | null,
"status": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "manual_receipts"
        isOneToOne: true
        isSetofReturn: false
      } },
"propose_landmark":
{ Args: { "p_aliases"?: (string)[],"p_category": Database["public"]['Enums']["landmark_category"],"p_name": string,"p_photo"?: string,"p_point": unknown }; Returns: {
              "aliases": (string)[],
"category": Database["public"]['Enums']["landmark_category"],
"created_at": string,
"geom": unknown,
"id": string,
"landmark_id": string | null,
"name": string,
"photo_url": string | null,
"proposed_by": string | null,
"reviewed_by": string | null,
"role": Database["public"]['Enums']["user_role"] | null,
"status": Database["public"]['Enums']["geo_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "landmark_proposals"
        isOneToOne: true
        isSetofReturn: false
      } },
"purge_deleted_accounts":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"purge_ride_locations":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"record_physical_verification":
{ Args: { "p_driver": string,"p_note": string }; Returns: undefined
                           },
"register_push_device":
{ Args: { "p_platform": string,"p_token": string,"p_user": string }; Returns: undefined
                           },
"reject_manual_receipt":
{ Args: { "p_reason": string,"p_receipt": string }; Returns: {
              "amount": number,
"approved_at": string | null,
"approved_by": string | null,
"claim_id": string | null,
"created_at": string,
"created_by": string,
"driver_id": string,
"id": string,
"kind": string,
"method": string,
"payment_id": string | null,
"previous_receipt_id": string | null,
"proof_path": string,
"reference": string,
"rejected_at": string | null,
"rejected_by": string | null,
"rejection_reason": string | null,
"status": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "manual_receipts"
        isOneToOne: true
        isSetofReturn: false
      } },
"reopen_vehicle_review":
{ Args: { "p_driver": string,"p_reason": string }; Returns: undefined
                           },
"report_incident":
{ Args: { "p_kind": Database["public"]['Enums']["incident_kind"],"p_message"?: string,"p_ride"?: string }; Returns: {
              "assigned_to": string | null,
"created_at": string,
"id": string,
"kind": Database["public"]['Enums']["incident_kind"],
"message": string | null,
"reporter": string,
"resolution_note": string | null,
"resolved_at": string | null,
"ride_id": string | null,
"status": Database["public"]['Enums']["incident_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "incidents"
        isOneToOne: true
        isSetofReturn: false
      } },
"request_account_deletion":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"request_quoted_pickup":
{ Args: { "p_dest_hint"?: string,"p_dest_landmark"?: string,"p_meeting_landmark": string,"p_origin_hint"?: string,"p_quote": string }; Returns: {
              "accepted_at": string | null,
"arrived_at": string | null,
"cancel_reason": string | null,
"category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"completed_at": string | null,
"created_at": string,
"dest_geom": unknown,
"dest_hint": string | null,
"dest_landmark_id": string | null,
"distance_est_m": number | null,
"driver_id": string | null,
"duration_est_s": number | null,
"id": string,
"meeting_landmark_id": string | null,
"origin_geom": unknown,
"origin_hint": string | null,
"origin_landmark_id": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"pin_code": string | null,
"price_est": number | null,
"price_final": number | null,
"scheduled_at": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["ride_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rides"
        isOneToOne: true
        isSetofReturn: false
      } },
"request_quoted_ride":
{ Args: { "p_dest_hint"?: string,"p_dest_landmark"?: string,"p_origin_hint"?: string,"p_origin_landmark"?: string,"p_quote": string }; Returns: {
              "accepted_at": string | null,
"arrived_at": string | null,
"cancel_reason": string | null,
"category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"completed_at": string | null,
"created_at": string,
"dest_geom": unknown,
"dest_hint": string | null,
"dest_landmark_id": string | null,
"distance_est_m": number | null,
"driver_id": string | null,
"duration_est_s": number | null,
"id": string,
"meeting_landmark_id": string | null,
"origin_geom": unknown,
"origin_hint": string | null,
"origin_landmark_id": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"pin_code": string | null,
"price_est": number | null,
"price_final": number | null,
"scheduled_at": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["ride_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rides"
        isOneToOne: true
        isSetofReturn: false
      } },
"request_ride":
{ Args: { "p_category": Database["public"]['Enums']["vehicle_category"],"p_dest": unknown,"p_dest_hint"?: string,"p_dest_landmark"?: string,"p_distance_m": number,"p_duration_s": number,"p_origin": unknown,"p_origin_hint"?: string,"p_origin_landmark"?: string,"p_payment_method"?: Database["public"]['Enums']["payment_method"],"p_scheduled_at"?: string }; Returns: {
              "accepted_at": string | null,
"arrived_at": string | null,
"cancel_reason": string | null,
"category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"completed_at": string | null,
"created_at": string,
"dest_geom": unknown,
"dest_hint": string | null,
"dest_landmark_id": string | null,
"distance_est_m": number | null,
"driver_id": string | null,
"duration_est_s": number | null,
"id": string,
"meeting_landmark_id": string | null,
"origin_geom": unknown,
"origin_hint": string | null,
"origin_landmark_id": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"pin_code": string | null,
"price_est": number | null,
"price_final": number | null,
"scheduled_at": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["ride_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rides"
        isOneToOne: true
        isSetofReturn: false
      } },
"respond_offer":
{ Args: { "p_accept": boolean,"p_offer": string }; Returns: {
              "accepted_at": string | null,
"arrived_at": string | null,
"cancel_reason": string | null,
"category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"completed_at": string | null,
"created_at": string,
"dest_geom": unknown,
"dest_hint": string | null,
"dest_landmark_id": string | null,
"distance_est_m": number | null,
"driver_id": string | null,
"duration_est_s": number | null,
"id": string,
"meeting_landmark_id": string | null,
"origin_geom": unknown,
"origin_hint": string | null,
"origin_landmark_id": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"pin_code": string | null,
"price_est": number | null,
"price_final": number | null,
"scheduled_at": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["ride_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rides"
        isOneToOne: true
        isSetofReturn: false
      } },
"retry_alpha_dispatch":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"reverse_geocode_landmark":
{ Args: { "p_max_m"?: number,"p_point": unknown }; Returns: string
                           },
"revise_manual_receipt":
{ Args: { "p_amount": number,"p_method": string,"p_proof_path": string,"p_receipt": string }; Returns: {
              "amount": number,
"approved_at": string | null,
"approved_by": string | null,
"claim_id": string | null,
"created_at": string,
"created_by": string,
"driver_id": string,
"id": string,
"kind": string,
"method": string,
"payment_id": string | null,
"previous_receipt_id": string | null,
"proof_path": string,
"reference": string,
"rejected_at": string | null,
"rejected_by": string | null,
"rejection_reason": string | null,
"status": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "manual_receipts"
        isOneToOne: true
        isSetofReturn: false
      } },
"ride_driver_card":
{ Args: { "p_ride": string }; Returns: Json
                           },
"ride_pin":
{ Args: { "p_ride": string }; Returns: string
                           },
"search_landmarks":
{ Args: { "p_limit"?: number,"p_query": string }; Returns: {
              "aliases": (string)[],
"category": Database["public"]['Enums']["landmark_category"],
"created_at": string,
"created_by": string | null,
"geom": unknown,
"id": string,
"name": string,
"photo_url": string | null,
"provenance": Database["public"]['Enums']["geo_provenance"],
"salience": number,
"source": Database["public"]['Enums']["geo_source"],
"status": Database["public"]['Enums']["geo_status"],
"updated_at": string,
"usage_count": number,
"validated_by": string | null,
"zone_id": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "landmarks"
        isOneToOne: false
        isSetofReturn: true
      } },
"send_settlement_reminders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"set_commission":
{ Args: { "p_type": string,"p_value": number }; Returns: Json
                           },
"set_service_mode":
{ Args: { "p_on": boolean }; Returns: undefined
                           },
"start_ride":
{ Args: { "p_pin": string,"p_ride": string }; Returns: {
              "accepted_at": string | null,
"arrived_at": string | null,
"cancel_reason": string | null,
"category": Database["public"]['Enums']["vehicle_category"],
"client_id": string,
"completed_at": string | null,
"created_at": string,
"dest_geom": unknown,
"dest_hint": string | null,
"dest_landmark_id": string | null,
"distance_est_m": number | null,
"driver_id": string | null,
"duration_est_s": number | null,
"id": string,
"meeting_landmark_id": string | null,
"origin_geom": unknown,
"origin_hint": string | null,
"origin_landmark_id": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"pin_code": string | null,
"price_est": number | null,
"price_final": number | null,
"scheduled_at": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["ride_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rides"
        isOneToOne: true
        isSetofReturn: false
      } },
"start_ride_checked":
{ Args: { "p_pin": string,"p_ride": string }; Returns: Json
                           },
"suggest_meeting_landmark":
{ Args: { "p_max_m"?: number,"p_point": unknown }; Returns: string
                           },
"sweep_push_delivery":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"touch_last_seen":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"unregister_session_devices":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"update_reviewed_vehicle":
{ Args: { "p_category": Database["public"]['Enums']["vehicle_category"],"p_plate": string,"p_reason": string,"p_vehicle": string }; Returns: {
              "category": Database["public"]['Enums']["vehicle_category"],
"created_at": string,
"driver_id": string,
"id": string,
"photo_url": string | null,
"plate": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "vehicles"
        isOneToOne: true
        isSetofReturn: false
      } },
"validate_kyc":
{ Args: { "p_accept": boolean,"p_driver": string,"p_note"?: string }; Returns: undefined
                           },
"validate_landmark_proposal":
{ Args: { "p_accept": boolean,"p_proposal": string }; Returns: string
                           },
"validate_road_proposal":
{ Args: { "p_accept": boolean,"p_proposal": string }; Returns: string
                           }
          }
          Enums: {
            "admin_role": "ops"|"carto"|"finance"|"superadmin","coverage_status": "insufficient"|"ready","document_type": "id_card"|"license"|"registration"|"insurance"|"vehicle_photo"|"criminal_record"|"profile_photo","geo_provenance": "teko"|"osm"|"mixte","geo_source": "osm"|"admin"|"driver"|"client"|"proposed","geo_status": "draft"|"proposed"|"validated"|"rejected"|"merged","incident_kind": "sos"|"report"|"dispute","incident_status": "open"|"in_progress"|"resolved","kyc_status": "pending"|"validated"|"rejected","landmark_category": "fuel_station"|"roundabout"|"market"|"church"|"school"|"pharmacy"|"bar"|"building"|"junction"|"other","ledger_kind": "commission_due"|"mobile_credit"|"settlement"|"payout"|"cancellation"|"adjustment","offer_status": "pending"|"accepted"|"declined"|"expired"|"cancelled","payment_direction": "in"|"out","payment_kind": "ride_collection"|"driver_settlement"|"payout"|"cancellation_fee"|"refund","payment_method": "cash"|"airtel","payment_status": "initiated"|"pending"|"success"|"failed"|"ambiguous","ride_status": "requested"|"accepted"|"enroute"|"arrived"|"started"|"completed"|"cancelled_client"|"cancelled_driver"|"no_show"|"no_answer"|"failed","saved_place_kind": "home"|"work"|"other","statement_status": "open"|"settled"|"overdue"|"paid_out","user_role": "client"|"driver"|"admin","vehicle_category": "eco"|"moto"|"confort"|"covoiturage"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {

          }
        },"public": {
          Enums: {
            "admin_role": ["ops", "carto", "finance", "superadmin"],"coverage_status": ["insufficient", "ready"],"document_type": ["id_card", "license", "registration", "insurance", "vehicle_photo", "criminal_record", "profile_photo"],"geo_provenance": ["teko", "osm", "mixte"],"geo_source": ["osm", "admin", "driver", "client", "proposed"],"geo_status": ["draft", "proposed", "validated", "rejected", "merged"],"incident_kind": ["sos", "report", "dispute"],"incident_status": ["open", "in_progress", "resolved"],"kyc_status": ["pending", "validated", "rejected"],"landmark_category": ["fuel_station", "roundabout", "market", "church", "school", "pharmacy", "bar", "building", "junction", "other"],"ledger_kind": ["commission_due", "mobile_credit", "settlement", "payout", "cancellation", "adjustment"],"offer_status": ["pending", "accepted", "declined", "expired", "cancelled"],"payment_direction": ["in", "out"],"payment_kind": ["ride_collection", "driver_settlement", "payout", "cancellation_fee", "refund"],"payment_method": ["cash", "airtel"],"payment_status": ["initiated", "pending", "success", "failed", "ambiguous"],"ride_status": ["requested", "accepted", "enroute", "arrived", "started", "completed", "cancelled_client", "cancelled_driver", "no_show", "no_answer", "failed"],"saved_place_kind": ["home", "work", "other"],"statement_status": ["open", "settled", "overdue", "paid_out"],"user_role": ["client", "driver", "admin"],"vehicle_category": ["eco", "moto", "confort", "covoiturage"]
          }
        }
} as const
