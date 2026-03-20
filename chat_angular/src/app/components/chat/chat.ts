import {
  Component,
  ViewChild,
  ElementRef,
  inject,
  OnInit,
  OnDestroy,
  AfterViewChecked
} from '@angular/core';

import { mensajechat } from '../../../models/chat';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { ChatService } from '../../services/chat';
import { Router } from '@angular/router';
import { User } from '@angular/fire/auth';
import { Subscription, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, OnDestroy, AfterViewChecked {

  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private router = inject(Router);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  usuario: User | null = null;

  mensajes: mensajechat[] = [];
  cargandohistorial = true;
  asistenteEscribiendo = false;
  mensajeTexto = '';
  enviandoMensaje = false;
  mensajeError = '';

  private suscripciones: Subscription[] = [];
  private debeHacerScroll = false;

  // -------------------------------
  // Verificar autenticación
  // -------------------------------
  private async verificarAutenticacion(): Promise<void> {

    console.log('Verificando autenticación...');

    try {

      this.usuario = await firstValueFrom(this.authService.usuario$);

      if (!this.usuario) {
        await this.router.navigate(['/auth']);
        throw new Error('Usuario no autenticado');
      }

      console.log('Usuario autenticado:', this.usuario.uid);

    } catch (error) {
      console.error('Error verificando autenticación', error);
      throw error;
    }
  }

  // -------------------------------
  // Inicializar chat
  // -------------------------------
  private async inicializarChat(): Promise<void> {

    if (!this.usuario) return;

    console.log('Inicializando chat...');

    try {

      await this.chatService.InicializarChat(this.usuario.uid);

      this.cargandohistorial = false;

    } catch (error) {

      console.error('Error al inicializar el chat:', error);

    }
  }

  // -------------------------------
  // Suscripciones
  // -------------------------------
  private configurarSuscripciones(): void {

    const subMensajes = this.chatService.mensajes$
      .subscribe(mensajes => {

        this.mensajes = mensajes;
        this.debeHacerScroll = true;

      });

    const subAsistente = this.chatService.asistenteRespondiendo$
      .subscribe(respondiendo => {

        this.asistenteEscribiendo = respondiendo;
        this.debeHacerScroll = true;

      });

    this.suscripciones.push(subMensajes, subAsistente);
  }

  // -------------------------------
  // Scroll automático
  // -------------------------------
  private scrollHaciaAbajo(): void {

    try {

      const container = this.messagesContainer.nativeElement;

      if (container) {
        container.scrollTop = container.scrollHeight;
      }

    } catch (error) {

      console.error('Error al hacer scroll:', error);

    }
  }

  ngAfterViewChecked(): void {

    if (this.debeHacerScroll) {

      this.scrollHaciaAbajo();
      this.debeHacerScroll = false;

    }
  }

  // -------------------------------
  // Enviar mensaje
  // -------------------------------
  async enviarmensaje(): Promise<void> {

    this.mensajeError = '';
    this.enviandoMensaje = true;

    const texto = this.mensajeTexto.trim();

    try {

      await this.chatService.enviarMensaje(texto);

      this.mensajeTexto = '';
      this.enfocarInput();

    } catch (error: any) {

      console.error('Error al enviar mensaje', error);

      this.mensajeError =
        error.message || 'Error al enviar el mensaje';

      this.mensajeTexto = texto;

    } finally {

      this.enviandoMensaje = false;

    }
  }

  manejarTeclaPresionada(event: KeyboardEvent): void {

    if (event.key === 'Enter' && !event.shiftKey) {

      event.preventDefault();
      this.enviarmensaje();

    }
  }

  // -------------------------------
  // Logout
  // -------------------------------
  async logout(): Promise<void> {

    try {

      this.chatService.limpiarChat();

      await this.authService.logout();

      await this.router.navigate(['/auth']);

    } catch (error) {

      console.error('Error al cerrar sesión:', error);

      this.mensajeError =
        'Error al cerrar sesión. Inténtalo nuevamente.';

    }
  }

  // -------------------------------
  // UI helpers
  // -------------------------------
  manejoerrorimagen(evento: any): void {

    evento.target.src =
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0yeW9q0GCj5xqmw_Tp3gmzOI0v7gdjf2R1Q&s';
  }

  trackbymensaje(index: number, mensaje: mensajechat) {

    return mensaje.id ||
      `${mensaje.tipo}-${mensaje.fechadeenvio.getTime()}`;
  }

  formatearMensajeAsistente(contenido: string) {

    return contenido
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  formatearHora(fecha: Date): string {

    return fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private enfocarInput() {

    setTimeout(() => {

      this.messageInput?.nativeElement.focus();

    }, 100);
  }

  // -------------------------------
  // Lifecycle
  // -------------------------------
  async ngOnInit(): Promise<void> {

    try {

      await this.verificarAutenticacion();

      await this.inicializarChat();

      this.configurarSuscripciones();

    } catch (error) {

      console.error('Error al iniciar el chat', error);

      this.mensajeError =
        'Error al cargar el chat. Inténtalo nuevamente.';
    }
  }

  ngOnDestroy(): void {

    this.suscripciones.forEach(sub => sub.unsubscribe());

  }
}