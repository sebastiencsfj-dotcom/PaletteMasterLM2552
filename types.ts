
export enum SlotStatus {
  EMPTY = 'EMPTY',
  JAUNE = 'JAUNE', // Attente reprogrammation
  BLANC = 'BLANC', // Reprogrammé, attente expédition
  ROUGE = 'ROUGE', // Refusé (annulation prévue)
  BLEU = 'BLEU',   // Annulé (retour magasin)
  ORANGE = 'ORANGE', // Erreur de statut ou article restant
}

export interface Order {
  id: string;
  orderNumber: string;
  flux: 'CDC' | 'LCD' | 'RET' | 'REG' | '';
  clientName: string;
  date: string;
  info: string;
  tournee?: string;
  comment: string;
  createdAt?: number; // Timestamp d'arrivée
}

export interface SasItem extends Partial<Order> {
  id: string;
}

export interface ReturnItem {
  id: string;
  returnNumber: string;
  clientName: string;
  date: string;
  createdAt?: number;
  archivedAt?: number;
}

export interface OrderArchive {
  orderNumber: string;
  clientName: string;
  entryTime: number;
  exitTime: number;
  flux?: string;
  locationId: string;
}

export interface PalletSlot {
  locationId: string;
  status: SlotStatus;
  order?: Order;
}

export type ViewMode = 'HOME' | 'SAS' | 'GRID' | 'LIST' | 'RETOURS' | 'ARCHIVES';
