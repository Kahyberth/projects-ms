export interface viewProjectTemplateProps {
  host: string;
  invitedName: string;
  invitedEmail: string;
  link: string;
  projectName: string;
  teamName: string;
}

export const viewProjectTemplatePage = (
  viewProjectProps: viewProjectTemplateProps,
) => `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
  </head>
  <body
    style='background-color:rgb(242,242,247);font-family:ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";padding-top:40px;padding-bottom:40px'>
    <!--$-->
    <div
      style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">
      ${viewProjectProps.host} te ha agregado al proyecto &quot;${viewProjectProps.teamName}&quot; en TaskMate
      <div>
         ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿
      </div>
    </div>
    <table
      align="center"
      width="100%"
      border="0"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      style="max-width:600px">
      <tbody>
        <tr style="width:100%">
          <td>
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="background-color:rgb(0,0,0);border-top-left-radius:16px;border-top-right-radius:16px;padding-left:40px;padding-right:40px;padding-top:32px;padding-bottom:32px;text-align:center">
              <tbody>
                <tr>
                  <td>
                    <p
                      style="font-size:20px;font-weight:700;color:rgb(255,255,255);margin:0px;line-height:24px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                      Task<span style="color:rgb(56,178,172)">Mate</span>
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="background-color:rgb(255,255,255);padding-left:40px;padding-right:40px;padding-top:48px;padding-bottom:48px">
              <tbody>
                <tr>
                  <td>
                    <h1
                      style="font-size:28px;font-weight:700;color:rgb(0,0,0);margin:0px;margin-bottom:24px">
                      Bienvenido/a a un nuevo proyecto
                    </h1>
                    <p
                      style="font-size:16px;line-height:24px;color:rgb(51,51,51);margin:0px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                      Hola
                      <!-- -->${viewProjectProps.invitedName}<!-- -->,
                    </p>
                    <p
                      style="font-size:16px;line-height:24px;color:rgb(51,51,51);margin:0px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                      <strong>${viewProjectProps.host}</strong> te ha agregado al
                      proyecto
                      <strong
                        >&quot;<!-- -->${viewProjectProps.projectName}<!-- -->&quot;</strong
                      >
                      en <strong>${viewProjectProps.teamName}</strong>.
                    </p>
                    <p
                      style="font-size:16px;line-height:24px;color:rgb(51,51,51);margin:0px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                      Ya tienes acceso completo al proyecto y puedes comenzar a
                      colaborar de inmediato.
                    </p>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="background-color:rgb(248,248,250);border-radius:12px;padding:24px;margin-bottom:32px;border-left-width:4px;border-color:rgb(56,178,172)">
                      <tbody>
                        <tr>
                          <td>
                            <p
                              style="font-size:16px;line-height:24px;color:rgb(51,51,51);font-weight:500;margin:0px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                              Como miembro del equipo, ahora puedes:
                            </p>
                            <p
                              style="font-size:16px;line-height:24px;color:rgb(51,51,51);margin:0px;margin-bottom:0px;display:flex;align-items:center;margin-top:0px;margin-left:0px;margin-right:0px">
                              <span
                                style="display:inline-block;width:6px;height:6px;border-radius:9999px;background-color:rgb(56,178,172);margin-right:10px"></span
                              >Colaborar en sprints y tareas ágiles
                            </p>
                            <p
                              style="font-size:16px;line-height:24px;color:rgb(51,51,51);margin:0px;margin-bottom:0px;display:flex;align-items:center;margin-top:0px;margin-left:0px;margin-right:0px">
                              <span
                                style="display:inline-block;width:6px;height:6px;border-radius:9999px;background-color:rgb(56,178,172);margin-right:10px"></span
                              >Participar en la planificación de proyectos
                            </p>
                            <p
                              style="font-size:16px;line-height:24px;color:rgb(51,51,51);margin:0px;margin-bottom:0px;display:flex;align-items:center;margin-top:0px;margin-left:0px;margin-right:0px">
                              <span
                                style="display:inline-block;width:6px;height:6px;border-radius:9999px;background-color:rgb(56,178,172);margin-right:10px"></span
                              >Acceder a tableros Kanban y herramientas Scrum
                            </p>
                            <p
                              style="font-size:16px;line-height:24px;color:rgb(51,51,51);margin:0px;display:flex;align-items:center;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                              <span
                                style="display:inline-block;width:6px;height:6px;border-radius:9999px;background-color:rgb(56,178,172);margin-right:10px"></span
                              >Comunicarte con el equipo en tiempo real
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="text-align:center;margin-bottom:32px">
                      <tbody>
                        <tr>
                          <td>
                            <a
                              href="${viewProjectProps.link}"
                              class="hover:bg-[#333333]"
                              style="background-color:rgb(0,0,0);border-radius:12px;color:rgb(255,255,255);font-weight:500;padding-top:16px;padding-bottom:16px;padding-left:32px;padding-right:32px;font-size:16px;text-decoration-line:none;text-align:center;display:inline-block;box-sizing:border-box;transition-property:all;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;margin-bottom:16px;line-height:100%;text-decoration:none;max-width:100%;mso-padding-alt:0px;padding:16px 32px 16px 32px"
                              target="_blank"
                              ><span
                                ><!--[if mso]><i style="mso-font-width:400%;mso-text-raise:24" hidden>&#8202;&#8202;&#8202;&#8202;</i><![endif]--></span
                              ><span
                                style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:12px"
                                >Ver proyecto</span
                              ><span
                                ><!--[if mso]><i style="mso-font-width:400%" hidden>&#8202;&#8202;&#8202;&#8202;&#8203;</i><![endif]--></span
                              ></a
                            >
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="background-color:rgb(248,248,250);border-radius:12px;padding:24px;margin-bottom:32px">
                      <tbody>
                        <tr>
                          <td>
                            <p
                              style="font-size:16px;line-height:24px;color:rgb(51,51,51);font-weight:500;margin:0px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                              Detalles del proyecto:
                            </p>
                            <p
                              style="font-size:15px;line-height:22px;color:rgb(51,51,51);margin:0px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                              <strong>Nombre:</strong>
                              <!-- -->${viewProjectProps.projectName}
                            </p>
                            <p
                              style="font-size:15px;line-height:22px;color:rgb(51,51,51);margin:0px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                              <strong>Equipo:</strong>
                              <!-- -->${viewProjectProps.teamName}
                            </p>
                            <p
                              style="font-size:15px;line-height:22px;color:rgb(51,51,51);margin:0px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                              <strong>Administrador:</strong>
                              <!-- -->${viewProjectProps.host}
                            </p>
                            <p
                              style="font-size:15px;line-height:22px;color:rgb(51,51,51);margin:0px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                              <strong>Fecha de inicio:</strong>
                              <!-- -->${new Date().toLocaleDateString()}
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <hr
                      style="border-color:rgb(230,230,230);margin-top:32px;margin-bottom:32px;width:100%;border:none;border-top:1px solid #eaeaea" />
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation">
                      <tbody>
                        <tr>
                          <td>
                            <p
                              style="font-size:16px;line-height:24px;color:rgb(51,51,51);font-weight:500;margin:0px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                              Próximos pasos:
                            </p>
                            <p
                              style="font-size:15px;line-height:22px;color:rgb(51,51,51);margin:0px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                              1. Revisa la documentación del proyecto
                            </p>
                            <p
                              style="font-size:15px;line-height:22px;color:rgb(51,51,51);margin:0px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                              2. Presenta tu perfil al equipo
                            </p>
                            <p
                              style="font-size:15px;line-height:22px;color:rgb(51,51,51);margin:0px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                              3. Asiste a la próxima reunión de planificación
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <hr
                      style="border-color:rgb(230,230,230);margin-top:32px;margin-bottom:32px;width:100%;border:none;border-top:1px solid #eaeaea" />
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="text-align:center">
                      <tbody>
                        <tr>
                          <td>
                            <p
                              style="font-size:14px;color:rgb(102,102,102);margin:0px;margin-bottom:0px;line-height:24px;margin-top:0px;margin-left:0px;margin-right:0px">
                              ¿Necesitas ayuda?
                            </p>
                            <p
                              style="font-size:14px;color:rgb(102,102,102);margin:0px;line-height:24px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                              Contacta a nuestro equipo de soporte en<!-- -->
                              <a
                                href="mailto:soporte@taskmate.app"
                                style="color:rgb(56,178,172);font-weight:500;text-decoration-line:none"
                                target="_blank"
                                >soporte@taskmate.app</a
                              >
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="background-color:rgb(248,248,250);border-bottom-right-radius:16px;border-bottom-left-radius:16px;padding-left:40px;padding-right:40px;padding-top:24px;padding-bottom:24px;text-align:center">
              <tbody>
                <tr>
                  <td>
                    <p
                      style="font-size:12px;color:rgb(102,102,102);margin:0px;margin-bottom:0px;line-height:24px;margin-top:0px;margin-left:0px;margin-right:0px">
                      ©
                      <!-- -->2025<!-- -->
                      TaskMate. Todos los derechos reservados.
                    </p>
                    <p
                      style="font-size:12px;color:rgb(102,102,102);margin:0px;margin-bottom:0px;line-height:24px;margin-top:0px;margin-left:0px;margin-right:0px">
                      Calle Innovación 123, Bogotá, Colombia
                    </p>
                    <p
                      style="font-size:12px;color:rgb(102,102,102);margin:0px;line-height:24px;margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                      <a
                        href="https://taskmate.app/preferences"
                        style="color:rgb(102,102,102);text-decoration-line:underline;margin-right:16px"
                        target="_blank"
                        >Preferencias</a
                      ><a
                        href="https://taskmate.app/privacy"
                        style="color:rgb(102,102,102);text-decoration-line:underline;margin-right:16px"
                        target="_blank"
                        >Privacidad</a
                      ><a
                        href="https://taskmate.app/unsubscribe"
                        style="color:rgb(102,102,102);text-decoration-line:underline"
                        target="_blank"
                        >Cancelar suscripción</a
                      >
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <!--7--><!--/$-->
  </body>
</html>
`;
