import { Injectable, inject } from '@angular/core';
import { Auth, user, User } from '@angular/fire/auth';
import { map } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  
  private auth = inject(Auth)

  //variable tipo observable 

  usuario$ = user(this.auth)

  //variable observable que devuelve true o false si el usuario esta autenticado o no
  estaAutenticado$ = this.usuario$.pipe(
    map(usuario => !!usuario)
  )

  //funcion asincrona que permite el inicio de sesion 
  async iniciarSesion():Promise<Usuario | null>{
      try{
        const proveedor = new GoogleAuthProvider();

        //controladores
        proveedor.addScope('email')
        proveedor.addScope('profile')

        const resultado = await signInWithPopup(this.auth, proveedor)
        const usuarioFirebase = resultado.user

        if(usuarioFirebase){
          const usuario: Usuario = {
            uid: usuarioFirebase.uid,
            nombre: usuarioFirebase.displayName || 'Usuario sin nombre',
            email: usuarioFirebase.email || '',
            fotourl: usuarioFirebase.photoURL || undefined,
            fechacreacion: new Date(),
            ultimaconexion: new Date(),
          }
          return usuario;
        }

        return null;
      }catch(error){
        console.error('Error al iniciar sesión:', error);
        throw error
    } 
  }

  obtenerUsuario(): User | null{
    return this.auth.currentUser;
  }

  // cerrar sesion 
  
  async logout(): Promise<void>{
    try{
      await signOut(this.auth);  
    }catch(error){
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  
  }

}