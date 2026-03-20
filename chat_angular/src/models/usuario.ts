export interface Usuario {
    uid: string;
    nombre?: string;
    email: string;
    fotourl?: string;
    fechacreacion: Date;
    ultimaconexion: Date;
}