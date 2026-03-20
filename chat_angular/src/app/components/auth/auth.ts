import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';


@Component({
  selector: 'app-auth',
  imports: [],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {
  mensajeError = "❌ Ocurrió un error al iniciar sesión. Por favor, inténtalo de nuevo.";
  autenticando = false;

  private authService = inject(AuthService);
  private router = inject(Router);

  async loginWithGoogle() : Promise<void> {
    this.autenticando = true;
    this.mensajeError = "";
    try {
      //falta implementar el servicio
      
      const usuario = await this.authService.iniciarSesion()

      /*//simular un usuario ya creado
      let usuario=null
      usuario = await new Promise((resolve ) => setTimeout(() => resolve({nombre: "Usuario Ejemplo"}), 1000));
      */
      if (usuario) {
        await this.router.navigate(['/chat']);
      }else {
        this.mensajeError = "❌ Usuario no encontrado. Por favor, regístrate primero.";
        console.error("Usuario no encontrado");
      }
  }catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.error("❌ El proceso de autenticación fue cancelado. Por favor, inténtalo de nuevo.");
    }if (error.code === 'auth/network-request-failed') {
      console.error("❌ Error de red. Por favor, verifica tu conexión e inténtalo de nuevo.");
    }
  }finally {
    this.autenticando = false;
  }

}
  //verificar si el usuario ya está autenticado al cargar el componente
  ngOnInit(): void {
    this.authService.estaAutenticado$.subscribe(autenticando =>{
      if(autenticando){
        this.router.navigate(['/chat']);
      }
    });
  }
}
