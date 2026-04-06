import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, catchError } from 'rxjs';
import { Observable, throwError } from 'rxjs';
import {environment} from '../../environments/environment';

interface peticionGemini{
  contents: contentGemini[];
  generationConfig?:{
    maxOutputTokens?: number;
    temperature?: number;
  }
  safetySettings: safetySettings[];
}

interface contentGemini{
  role: 'user'|'model';
  parts: partGemini[];
}

interface partGemini{
  text: string;
}

interface safetySettings{
  category: string;
  threshold: string;
}

interface respuestaGemini{
  candidates:{
    content:{
      parts:{
        text: string;
      }[];
    };
    finishReason: string;
  }[];
  usageMetaData?:{
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {

  //inyecciones de dependencias
  private http = inject(HttpClient)

  //variables que llevan la URL
  private apiUrl = environment.gemini.apiUrl
  private apiKey = environment.gemini.apiKey

  enviarMensaje(mensaje: string, historialPrevio: contentGemini[]=[]): Observable<string>{

    //verificar si la Url esta bien configurada
    if(!this.apiKey || this.apiKey ==='el pepe'){
      console.error('la api Key no esta configurada')
      return throwError(()=>new Error ('La API Key no está configurada'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    })

    //vamos a enviar un mensaje al contenido del sistema
    const mensajeSistema: contentGemini = {
      role: 'user',
      parts:[
        {
          text: 'Eres un asistente virtual que ayuda a los usuarios a resolver sus dudas sobre programacion, respondes de manera clara y concisa, si no sabes la respuesta lo dices, responde siempre español espacialemnte de manera costeña o paisa, si ya sumercce es de recursos bajos no se preocupe que la ia lo entiende y habla en el denominado venezolano, POBRE HP, (Porque hablar en guajiro ya es mucho level para mi, y aunque soy una IA, a mi si me alimentan) de manera responsable y tambien inteligente '
        }
      ]
    }

    const RespuestaSistema: contentGemini = {
      role: 'model',
      parts:[
        {
          text: 'Hola soy tu asistente virtual, ¿En qué puedo ayudarte sobre programacion?'
        }
      ]
    }

    const contenido: contentGemini[] = [
      mensajeSistema,
      RespuestaSistema,
      ...historialPrevio,
      {
        role: 'user',
        parts:[
          {
            text: mensaje
          }
        ]
      }
    ];

    const configuracionesSeguridad: safetySettings[]=[
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ];

    const cuerpoPeticion: peticionGemini={
      contents: contenido,
      generationConfig:{
        maxOutputTokens: 800,
        temperature: 0.7
      },
      safetySettings: configuracionesSeguridad
    };

    //vamos a genrar la URL completa
    const UrlCompleta= `${this.apiUrl}?key=${this.apiKey}`;

    //hacer la peticion a http de conectarnos a la api de gemini
    return this.http.post<respuestaGemini>(UrlCompleta, cuerpoPeticion, {headers})
      .pipe(

        map(respuesta=>{

          //vamos a revisar que la respuesta tenga un formato correcto
          if(respuesta.candidates && respuesta.candidates.length > 0) {

            const candidate = respuesta.candidates[0];

            if(candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {

              let contenidoRespuesta = candidate.content.parts[0].text;

              //validacion por si la respuesta es erronea por el limite de tokens
              if(candidate.finishReason ==='MAX_TOKENS'){
                contenidoRespuesta += "\n\n[Nota: respuesta truncada debido al límite de tokens]";
              }

              return contenidoRespuesta;

            }else{
              throw new Error('Respuesta no contiene un formato valido');
            }

          }else{
            throw new Error('Respuesta no contiene un formatto esperado')
          }

        }),

        catchError(error =>{

          console.log("Error al comunicarse con gemini")

          let mensajeError = 'Error al comunicarse con Gemini';

          if(error.status ===400){
            mensajeError = 'error peticion invalida a gemini, verifique la configuracion'
          }else if(error.status === 403){
            mensajeError = 'Acceso a Gemini prohibido, revise su API Key y permisos'
          }else if(error.status === 429){
            mensajeError = 'has excedido el limite de peticiones a Gemini, por favor intente mas tarde'
          }else if(error.status ===500){
            mensajeError = 'Error interno en Gemini, por favor intente mas tarde'
          }

          return throwError(()=> new Error(mensajeError));

        })
      )
  }

  //funcion para convertir al formato de gemini
  convertirHistorialGemini(mensaje: any[]): contentGemini[]{

    const historialConvertido: contentGemini[] = mensaje.map(msg => (
      {
        role: (msg.tipo ==='usuario' ? 'user' : 'model') as 'user' | 'model',
        parts: [
          {
            text: msg.contenido
          }
        ]
      }
    ));

    if(historialConvertido.length > 8){

      const ultimosMensajes = historialConvertido.slice(-8)

      if(ultimosMensajes.length > 0 && ultimosMensajes[0].role === 'model'){
        return ultimosMensajes.slice(1)
      }

      return ultimosMensajes;
    }

    return historialConvertido;
  }

  verificarConfiguracion(): boolean{

    const configuracionValidad = !!(
      this.apiKey &&
      this.apiKey !== 'el pepe' &&
      this.apiUrl
    );

    return configuracionValidad;
  }
}
