
import { SlotStatus } from './types';

export const STATUS_CONFIG = {
  [SlotStatus.EMPTY]: {
    label: 'DISPONIBLE',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    description: 'Emplacement vide'
  },
  [SlotStatus.JAUNE]: {
    label: 'FAILED',
    bgColor: 'bg-yellow-300',
    textColor: 'text-yellow-900',
    borderColor: 'border-yellow-400',
    description: 'En attente de reprogrammation'
  },
  [SlotStatus.BLANC]: {
    label: 'DÉPART',
    bgColor: 'bg-white',
    textColor: 'text-gray-900',
    borderColor: 'border-gray-300',
    description: 'commande reprogrammée.'
  },
  [SlotStatus.ROUGE]: {
    label: 'REFUS',
    bgColor: 'bg-red-500',
    textColor: 'text-white',
    borderColor: 'border-red-600',
    description: "En attente d'annulation"
  },
  [SlotStatus.BLEU]: {
    label: 'RETOUR ISOM',
    bgColor: 'bg-blue-600',
    textColor: 'text-white',
    borderColor: 'border-blue-700',
    description: 'Retour magasin (annulé)'
  },
  [SlotStatus.ORANGE]: {
    label: 'ORDER',
    bgColor: 'bg-orange-500',
    textColor: 'text-white',
    borderColor: 'border-orange-600',
    description: 'Erreur de statut ou article restant'
  }
};

export const generateInitialData = () => {
  const data: Record<string, any> = {};
  
  // Niveaux mis à jour : 0, 1, 2, 3
  for (let col = 1; col <= 9; col++) {
    for (let level of [0, 1, 2, 3]) {
      if (level === 3) {
        // Niveau 3 : Emplacement plein unique
        const id = `A-${col}-${level}`;
        data[id] = { locationId: id, status: SlotStatus.EMPTY };
      } else if (level === 0) {
        // Niveau 0 : Trois subdivisions (Haut, Milieu, Bas)
        const idHaut = `A-${col}-${level}-H`;
        const idMilieu = `A-${col}-${level}-M`;
        const idBas = `A-${col}-${level}-B`;
        data[idHaut] = { locationId: idHaut, status: SlotStatus.EMPTY };
        data[idMilieu] = { locationId: idMilieu, status: SlotStatus.EMPTY };
        data[idBas] = { locationId: idBas, status: SlotStatus.EMPTY };
      } else if (level === 1) {
        // Niveau 1 : Deux subdivisions (Haut, Bas)
        const idHaut = `A-${col}-${level}-H`;
        const idBas = `A-${col}-${level}-B`;
        data[idHaut] = { locationId: idHaut, status: SlotStatus.EMPTY };
        data[idBas] = { locationId: idBas, status: SlotStatus.EMPTY };
      } else if (level === 2) {
        // Niveau 2 : UNIQUEMENT BAS (Haut supprimé selon demande)
        const idBas = `A-${col}-${level}-B`;
        data[idBas] = { locationId: idBas, status: SlotStatus.EMPTY };
      }
    }
  }

  // ZONE A (Stockage au sol, 18 emplacements)
  for (let i = 1; i <= 18; i++) {
    const id = `ZA-${i}`;
    data[id] = { locationId: id, status: SlotStatus.EMPTY };
  }
  
  return data;
};
