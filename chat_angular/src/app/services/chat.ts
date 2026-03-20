import { inject, Injectable } from '@angular/core';
import { mensajechat} from '../../models/chat';
import { AuthService } from './auth';
import { FirebaseService } from './firebase';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { GeminiService } from './gemini';


@Injectable({
  providedIn: 'root',
})

export class ChatService {
  private authService = inject(AuthService)

  private geminiService = inject(GeminiService)

  private firebaseService = inject(FirebaseService)

  private mensajeSubject = new BehaviorSubject<mensajechat[]>([]);

  public mensajes$ = this.mensajeSubject.asObservable();

  private cargandoHistorial = false;

  private asistenteRespondiendo = new BehaviorSubject<boolean>(false);
  public asistenteRespondiendo$ = this.asistenteRespondiendo.asObservable();

  async InicializarChat(usuarioid: string): Promise<void>{
    if(this.cargandoHistorial){
      return;
    }
    this.cargandoHistorial = true;
    try{
      this.firebaseService.obtenerMensajesUsuario(usuarioid).subscribe({
        next: (mensajes: mensajechat[]) => {
          // Actualizando en BehaviorSubject
          this.mensajeSubject.next(mensajes);
          this.cargandoHistorial = false;
        },
        error: (error: any) => {
          console.log("Error al cargar el historial", error);
          this.cargandoHistorial = false;
          // Cargar con una lista vacia el Behavior Subject
          this.mensajeSubject.next([]);
        }
      });
    }catch(error){
      console.error('Error al cargar el historial', error)
      this.cargandoHistorial = false;
      this.mensajeSubject.next([]);
      throw error;
    }
  }

  async enviarMensaje( contenidoMensaje: string): Promise<void>{
    const usuarioActual = this.authService.obtenerUsuario()

    if(!usuarioActual){
      console.error('No hay un usuario autenticado');
      throw Error;
    }
    if(!contenidoMensaje.trim()){
      return ; 
    }

    const mensajeUsuario: mensajechat = {
      usuarioid: usuarioActual.uid,
      contenido: contenidoMensaje.trim(),
      fechadeenvio: new Date(),
      estado: 'enviado',
      tipo: 'usuario'
    }
    try{
      const mensajeDelUsuario = this.mensajeSubject.value;

      const nuevoMensajeEncontrado = [...mensajeDelUsuario, mensajeUsuario]
      this.mensajeSubject.next(nuevoMensajeEncontrado)

      try{
        await this.firebaseService.guardarMensaje(mensajeUsuario);
      } catch (firestoreError) {  
        console.error('No se pudo guardar el mensaje', firestoreError)
      }

      this.asistenteRespondiendo.next(true)

      const mensajesActuales = this.mensajeSubject.value;


      const historialParaGemini = this.geminiService.convertirHistorialGemini(
        mensajesActuales.slice(-6)
      );
      const respuestaGemini = await firstValueFrom(this.geminiService.enviarMensaje(
        contenidoMensaje,
        historialParaGemini
      ));

      //configurar el mensaje del asistente

      const mensajeAsistente: mensajechat = {
        usuarioid: usuarioActual.uid,
        contenido: respuestaGemini,
        fechadeenvio: new Date(),
        estado: 'enviado',
        tipo: 'asistente'
      };

      const mensajesActualizados =this.mensajeSubject.value;
      
      const NuevoMensajeEncontrado= [...mensajesActualizados, mensajeAsistente];
      this.mensajeSubject.next(NuevoMensajeEncontrado);
      try{
        await this.firebaseService.guardarMensaje(mensajeAsistente);

      } catch (firestoreError) {  
        console.error('No se pudo guardar el mensaje del asistente', firestoreError)
      }



    }catch (error) {
        console.error('Error al enviar mensaje', error);

        const mensajeError : mensajechat = {
      usuarioid: usuarioActual.uid,
      contenido: "Lo siento, no se pudo obtener una respuesta en este momento. Por favor, intenta de nuevo más tarde.",
      fechadeenvio: new Date(),
      estado: 'error',
      tipo: 'asistente'
    };

    try{
      await this.firebaseService.guardarMensaje(mensajeError);
    }catch (saveError) {
        console.error('Error al guardar mensaje de error', saveError);

        const mensajeActual = this.mensajeSubject.value;
        this.mensajeSubject.next([...mensajeActual, mensajeError]);
    }
    throw error;
    }finally{
      this.asistenteRespondiendo.next(false);
    }
  }

  limpiarChat(): void {
    this.mensajeSubject.next([]);
  }
  obtenerMensajes(): mensajechat[] {
    return this.mensajeSubject.value;
  }
}