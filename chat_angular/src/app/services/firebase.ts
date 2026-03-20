import { Injectable, inject } from '@angular/core';
import { Firestore,Timestamp,collection,query, where,onSnapshot,QuerySnapshot, DocumentData } from '@angular/fire/firestore';
import { mensajechat } from '../../models/chat';
import { reportUnhandledError } from 'rxjs/internal/util/reportUnhandledError';
import { addDoc } from 'firebase/firestore';
import { Observable } from 'rxjs';

interface ConversacionChat {
  id?: string;
  fechaCreacion: Date;
  ultimaActividad: Date;
  mensajes: mensajechat[];
  [key: string]: any;
}
@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private firestore = inject(Firestore)

  //funcion para guardar el mensaje
  async guardarMensaje(mensaje: mensajechat): Promise<void> {
    console.log('Guardando mensaje:', mensaje);
     try {
      //revisar si viene sin usuarioId 
      if (!mensaje.usuarioid) {
        throw new Error('El mensaje debe contener un usuarioid');
      }else if (!mensaje.contenido) {
        throw new Error('El mensaje debe contener un contenido');
      }else if (!mensaje.tipo) {
        throw new Error('El mensaje debe contener un tipo');
      }
    const coleccionMensajes = collection(this.firestore, 'mensajes');
    const mensajeGuardar = {
      usuarioid: mensaje.usuarioid,
      contenido: mensaje.contenido,
      tipo: mensaje.tipo,
      estado: mensaje.estado,
      fechadeenvio: Timestamp.fromDate(mensaje.fechadeenvio)
    };

    const docRef = await addDoc(coleccionMensajes, mensajeGuardar);


  }catch (error: any) {
    console.error('Error al guardar mensaje:', error);
    console.error('Detalles del error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
  }
}
  obtenerMensajesUsuario(usuarioid: String): Observable<mensajechat[]> {
    return new Observable((observer) => {

      const consulta = query(
        collection(this.firestore, 'mensajes'),
        where('usuarioid', '==', usuarioid),
      )

      //configurar el listener para que funcione en tiempo real snapshot
      const unsubscribe = onSnapshot(
        consulta,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const mensajes: mensajechat[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id : doc.id,
              usuarioid: data['usuarioid'],
              contenido: data['contenido'],
              estado: data['estado'],
              tipo: data['tipo'],
              //recordamos que firebase guarda timestamp, por lo que hay que convertirlo a date
              fechadeenvio : data['fechadeenvio'].toDate(),
            } as mensajechat;
          });
          //ordenar los mensajes por fecha de envio
            mensajes.sort((a, b) => a.fechadeenvio.getTime() - b.fechadeenvio.getTime());
            observer.next(mensajes);
          },
          error => {
            console.error('✖️ error al obtener mensajes en tiempo real');
            observer.error(error);
          }
         );
         //se retorna una des suscripcion al servicio
         return () => {
          unsubscribe();
        };
        });
  }

  //guardar la conversacion
  async guardarConversacion(conversacion: ConversacionChat): Promise<void> {
    try {
      const coleccionConversaciones = collection(this.firestore, 'mensajes');

      const conversacionGuardar = {
        ...conversacion,
        fechaCreacion: Timestamp.fromDate(conversacion.fechaCreacion),
        ultimaActividad: Timestamp.fromDate(conversacion.ultimaActividad),
        // conversion de la fechaenvio del mesajechat
        mensajes: conversacion.mensajes.map((mensaje: mensajechat) => ({
          ...mensaje,
          fechadeenvio: Timestamp.fromDate(mensaje.fechadeenvio),
        }))
      };
      await addDoc(coleccionConversaciones, conversacionGuardar);

    }catch (error) {
      console.error('✖️ error al guardar conversacion', error);
      throw error;
    }
  }
}
