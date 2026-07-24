export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bannieres: {
        Row: {
          actif: boolean
          created_at: string
          cta_lien: string | null
          cta_texte: string | null
          id: string
          image_url: string | null
          ordre: number
          sous_titre: string | null
          titre: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          cta_lien?: string | null
          cta_texte?: string | null
          id?: string
          image_url?: string | null
          ordre?: number
          sous_titre?: string | null
          titre: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          cta_lien?: string | null
          cta_texte?: string | null
          id?: string
          image_url?: string | null
          ordre?: number
          sous_titre?: string | null
          titre?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          nom: string
          ordre: number
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          ordre?: number
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          ordre?: number
          slug?: string
        }
        Relationships: []
      }
      commande_items: {
        Row: {
          commande_id: string
          created_at: string
          id: string
          nom_snapshot: string
          prix_snapshot: number | null
          produit_id: string | null
          quantite: number
        }
        Insert: {
          commande_id: string
          created_at?: string
          id?: string
          nom_snapshot: string
          prix_snapshot?: number | null
          produit_id?: string | null
          quantite?: number
        }
        Update: {
          commande_id?: string
          created_at?: string
          id?: string
          nom_snapshot?: string
          prix_snapshot?: number | null
          produit_id?: string | null
          quantite?: number
        }
        Relationships: [
          {
            foreignKeyName: "commande_items_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commande_items_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
        ]
      }
      commandes: {
        Row: {
          adresse: string | null
          created_at: string
          email: string | null
          id: string
          nom: string
          notes: string | null
          numero: number
          prenom: string
          source: string
          statut: string
          total: number
          whatsapp: string
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom: string
          notes?: string | null
          numero?: number
          prenom: string
          source?: string
          statut?: string
          total?: number
          whatsapp: string
        }
        Update: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          notes?: string | null
          numero?: number
          prenom?: string
          source?: string
          statut?: string
          total?: number
          whatsapp?: string
        }
        Relationships: []
      }
      parametres: {
        Row: {
          cle: string
          valeur: string | null
        }
        Insert: {
          cle: string
          valeur?: string | null
        }
        Update: {
          cle?: string
          valeur?: string | null
        }
        Relationships: []
      }
      produits: {
        Row: {
          categorie_id: string | null
          created_at: string
          description: string | null
          en_stock: boolean
          id: string
          image_url: string | null
          mis_en_avant: boolean
          nom: string
          ordre: number
          prix: number | null
          prix_sur_demande: boolean
          slug: string
          unite: string | null
          updated_at: string
        }
        Insert: {
          categorie_id?: string | null
          created_at?: string
          description?: string | null
          en_stock?: boolean
          id?: string
          image_url?: string | null
          mis_en_avant?: boolean
          nom: string
          ordre?: number
          prix?: number | null
          prix_sur_demande?: boolean
          slug: string
          unite?: string | null
          updated_at?: string
        }
        Update: {
          categorie_id?: string | null
          created_at?: string
          description?: string | null
          en_stock?: boolean
          id?: string
          image_url?: string | null
          mis_en_avant?: boolean
          nom?: string
          ordre?: number
          prix?: number | null
          prix_sur_demande?: boolean
          slug?: string
          unite?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produits_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          created_at: string
          email: string | null
          id: string
          lu: boolean
          message: string
          nom: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          lu?: boolean
          message: string
          nom: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          lu?: boolean
          message?: string
          nom?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
