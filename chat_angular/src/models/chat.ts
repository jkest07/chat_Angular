export interface mensajechat{
    id?:string;
    contenido:string;
    usuarioid:string;
    fechadeenvio: Date;
    estado:"enviado"|"enviando"|"error"|"temporal";
    tipo: "usuario"|"asistente";
}

export interface conversacionchat{
    uid: string;
    usuarioid: string;
    mensajes: mensajechat[];
    ultimaactividad: Date;
    fechacreacion: Date;
    titulo: string;
}